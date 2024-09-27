import express from "express"
import { Express } from "express"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import dotenv from "dotenv"
import cors from "cors"
import axios from "axios"

dotenv.config()
const app: Express = express();
const PORT: number = Number(process.env.PORT) || 3000
const jwtpwd: string = process.env.JWTPASSWORD || "123456"
const constr = process.env.MONGODB_URL

app.use(express.json())
app.use(cors())

const taskSchema = new mongoose.Schema({
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
})

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    tasks: [taskSchema],
})

const user = mongoose.model("user", userSchema)

mongoose.connect(constr || "")
    .then(() => console.log("Database connected successfully"))
    .catch((err) => console.log("Database connection error:", err))


app.post("/api/auth/signup", async (req: express.Request, res: express.Response) => {
    if (!req.body.username || !req.body.password) {
        res.status(403).json({ msg: "Insufficient Credential" });
        return
    }
    const username = req.body.username;
    const password = req.body.password;

    const f = await user.findOne({ username: username });
    if (f) {
        res.status(403).json({ msg: "User already present " });
        return;
    } else {
        await user.create({
            username: username,
            password: password,
            tasks: [],
        });

        res.status(200).json({ msg: "New user id created" });
    }
});

app.post("/api/auth/login", async (req: express.Request, res: express.Response) => {
    if (!req.body.username || !req.body.password)
        res.status(403).json({ msg: "Insufficient Credential" });
    else {
        const f = await user.findOne({ username: req.body.username, password: req.body.password });
        if (f) {
            const token = jwt.sign({ username: req.body.username }, jwtpwd, {
                expiresIn: "1d",
            });

            res.status(200).json({ token });
        } else {
            res.status(403).json({ msg: "User Not Found" });
        }
    }
});

//Middleware for authentication
app.use(async (req: express.Request, res: express.Response, next) => {
    try {
        const token: any = req.headers.authorization;
        const decoded: any = jwt.verify(token.split(" ")[1], jwtpwd);
        console.log(decoded);

        const human: any = await user.findOne({ username: decoded.username });
        
        next();
        
    } catch (e) {
        console.log("Error: " + e);
        res.status(403).json({ 
            msg: "User not authenticated" 
        });
    }
})

// Method to extract the username from jwt
app.get("/api/", async (req: express.Request, res: express.Response) => {
    try {
        const token: any = req.headers.authorization;
        const decoded: any = jwt.verify(token.split(" ")[1], jwtpwd);
        console.log(decoded);
        const response = await user.findOne({ username: decoded.username });

        if (!response) {
            res.status(403).json({
                msg: "JWT Expired, User Not Found"
            });
        }

        res.status(200).json({
            username: decoded.username
        });
    } catch (e) {
        res.status(403).json({
            msg: "JWT not valid I guess.."
        });
    }
});

// PATHS

app.post("/api/tasks", async (req: express.Request, res: express.Response) => {
	const token: any = req.headers.authorization;
    const decoded: any = jwt.verify(token.split(" ")[1], jwtpwd);
    
	// Contains the text part of data and req.file contains the file part
	const { title, description, status, priority, dueDate } = req.body;

    try {
        const date = new Date(dueDate);
        console.log(date);

        const human: any = await user.findOne({
            username: decoded.username
        })
        console.log(human);

        let tasks: any = human.tasks;
        tasks.push({ title, description, status, priority, dueDate: date });
        console.log(tasks);

        const result = await user.updateOne({
            username: decoded.username
        }, {
            tasks: tasks
        })
        console.log(result);
        
        res.status(200).json({ 
            msg: "tasks added...",
            result: result
        });
    } catch (err) {
        res.status(403).json({
            msg: "Something went wrong",
            err: err
        });
    }
});

app.get("/api/tasks", async (req: express.Request, res: express.Response) => {
    const token: any = req.headers.authorization;
    const decoded: any = jwt.verify(token.split(" ")[1], jwtpwd);

    const human: any = await user.findOne({ 
        username: decoded.username 
    });

    res.json({
        tasks: human.tasks 
    });
});

app.put("/api/tasks/:id", async (req: express.Request, res: express.Response) => {
    const id = req.params.id;
    console.log(id);
	const { title, description, status, priority, dueDate } = req.body
    
	const token: any = req.headers.authorization;
    const decoded: any = jwt.verify(token.split(" ")[1], jwtpwd);

    const human: any = await user.findOne({ 
        username: decoded.username
    });
    let tasks: any = human.tasks;

    for (let i = 0; i < tasks.length; i++) {
        const cur = tasks[i]._id.toString();
        
        if (cur.includes(id)) {
            tasks[i] = {
                title, description, status, priority, dueDate: new Date(dueDate)
            }
            break;
        }
    }

    const result = await user.updateOne({ 
        username: decoded.username 
    }, { 
        tasks: tasks
    });
    res.status(200).json({ 
        msg: "tasks updated",
        result: result
    });
})

app.delete("/api/tasks/:id", async (req: express.Request, res: express.Response) => {
    const id = req.params.id;
    console.log(id);
    
	const token: any = req.headers.authorization;
    const decoded: any = jwt.verify(token.split(" ")[1], jwtpwd);

    const human: any = await user.findOne({ 
        username: decoded.username 
    });

    let tasks: any[] = human.tasks;

    let newTasks: any[] = [];

    tasks.forEach((i: any) => {
        if (i._id.toString() != id) {
            newTasks.push(i);
        }
    })
    console.log(newTasks);

    const result: any = await user.updateOne({ 
        username: decoded.username 
    }, { 
        tasks: newTasks
    });

    res.status(200).json({ 
        msg: "task deleted",
        result: result
    });
})


// Server Start
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
})


// Function to reload the server in an interval
// so as to keep it alive and not to get killed
// on the free tier of render.com

const url = `https://taskshare-backend.onrender.com`; // Replace with your Render URL
const interval = 30000; // Interval in milliseconds (30 seconds)

function reloadWebsite() {
    axios.get(url)
    .then(response => {
        console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch(error => {
        console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}


setInterval(reloadWebsite, interval);
