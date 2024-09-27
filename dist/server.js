"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
const jwtpwd = process.env.JWTPASSWORD || "123456";
const constr = process.env.MONGODB_URL;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const taskSchema = new mongoose_1.default.Schema({
    title: String,
    description: String,
    status: {
        type: String,
        enum: ["todo", "inprogress", "completed"],
        default: "todo",
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
    },
    dueDate: Date,
});
const userSchema = new mongoose_1.default.Schema({
    username: String,
    password: String,
    tasks: [taskSchema],
});
const user = mongoose_1.default.model("user", userSchema);
mongoose_1.default.connect(constr || "")
    .then(() => console.log("Database connected successfully"))
    .catch((err) => console.log("Database connection error:", err));
app.post("/api/auth/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.body.username || !req.body.password) {
        res.status(403).json({ msg: "Insufficient Credential" });
        return;
    }
    const username = req.body.username;
    const password = req.body.password;
    const f = yield user.findOne({ username: username });
    if (f) {
        res.status(403).json({ msg: "User already present " });
        return;
    }
    else {
        yield user.create({
            username: username,
            password: password,
            tasks: [],
        });
        res.status(200).json({ msg: "New user id created" });
    }
}));
app.post("/api/auth/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.body.username || !req.body.password)
        res.status(403).json({ msg: "Insufficient Credential" });
    else {
        const f = yield user.findOne({ username: req.body.username, password: req.body.password });
        if (f) {
            const token = jsonwebtoken_1.default.sign({ username: req.body.username }, jwtpwd, {
                expiresIn: "1d",
            });
            res.status(200).json({ token });
        }
        else {
            res.status(403).json({ msg: "User Not Found" });
        }
    }
}));
//Middleware for authentication
app.use((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.headers.authorization;
        const decoded = jsonwebtoken_1.default.verify(token.split(" ")[1], jwtpwd);
        console.log(decoded);
        const human = yield user.findOne({ username: decoded.username });
        next();
    }
    catch (e) {
        console.log("Error: " + e);
        res.status(403).json({
            msg: "User not authenticated"
        });
    }
}));
// Method to extract the username from jwt
app.get("/api/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.headers.authorization;
        const decoded = jsonwebtoken_1.default.verify(token.split(" ")[1], jwtpwd);
        console.log(decoded);
        const response = yield user.findOne({ username: decoded.username });
        if (!response) {
            res.status(403).json({
                msg: "JWT Expired, User Not Found"
            });
        }
        res.status(200).json({
            username: decoded.username
        });
    }
    catch (e) {
        res.status(403).json({
            msg: "JWT not valid I guess.."
        });
    }
}));
// PATHS
app.post("/api/tasks", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.headers.authorization;
    const decoded = jsonwebtoken_1.default.verify(token.split(" ")[1], jwtpwd);
    // Contains the text part of data and req.file contains the file part
    const { title, description, status, priority, dueDate } = req.body;
    try {
        const date = new Date(dueDate);
        console.log(date);
        const human = yield user.findOne({
            username: decoded.username
        });
        console.log(human);
        let tasks = human.tasks;
        tasks.push({ title, description, status, priority, dueDate: date });
        console.log(tasks);
        const result = yield user.updateOne({
            username: decoded.username
        }, {
            tasks: tasks
        });
        console.log(result);
        res.status(200).json({
            msg: "tasks added...",
            result: result
        });
    }
    catch (err) {
        res.status(403).json({
            msg: "Something went wrong",
            err: err
        });
    }
}));
app.get("/api/tasks", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.headers.authorization;
    const decoded = jsonwebtoken_1.default.verify(token.split(" ")[1], jwtpwd);
    const human = yield user.findOne({
        username: decoded.username
    });
    res.json({
        tasks: human.tasks
    });
}));
app.put("/api/tasks/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    console.log(id);
    const { title, description, status, priority, dueDate } = req.body;
    const token = req.headers.authorization;
    const decoded = jsonwebtoken_1.default.verify(token.split(" ")[1], jwtpwd);
    const human = yield user.findOne({
        username: decoded.username
    });
    let tasks = human.tasks;
    for (let i = 0; i < tasks.length; i++) {
        const cur = tasks[i]._id.toString();
        if (cur.includes(id)) {
            tasks[i] = {
                title, description, status, priority, dueDate: new Date(dueDate)
            };
            break;
        }
    }
    const result = yield user.updateOne({
        username: decoded.username
    }, {
        tasks: tasks
    });
    res.status(200).json({
        msg: "tasks updated",
        result: result
    });
}));
app.delete("/api/tasks/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    console.log(id);
    const token = req.headers.authorization;
    const decoded = jsonwebtoken_1.default.verify(token.split(" ")[1], jwtpwd);
    const human = yield user.findOne({
        username: decoded.username
    });
    let tasks = human.tasks;
    let newTasks = [];
    tasks.forEach((i) => {
        if (i._id.toString() != id) {
            newTasks.push(i);
        }
    });
    console.log(newTasks);
    const result = yield user.updateOne({
        username: decoded.username
    }, {
        tasks: newTasks
    });
    res.status(200).json({
        msg: "task deleted",
        result: result
    });
}));
// Server Start
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
// Function to reload the server in an interval
// so as to keep it alive and not to get killed
// on the free tier of render.com
const url = `https://shrtn-gj9w.onrender.com/`; // Replace with your Render URL
const interval = 30000; // Interval in milliseconds (30 seconds)
function reloadWebsite() {
    axios_1.default.get(url)
        .then(response => {
        console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
        .catch(error => {
        console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}
setInterval(reloadWebsite, interval);
