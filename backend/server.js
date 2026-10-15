
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const DEFAULT_PORT = 5000;
const PORT = parseInt(process.env.PORT, 10) || DEFAULT_PORT;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Task Schema
const taskSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true,
            trim: true
        },
        completed: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Task Model
const Task = mongoose.model('Task', taskSchema);

// GET: Fetch all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST: Create a task
app.post('/api/tasks', async (req, res) => {
    try {
        const { text } = req.body;

        if (typeof text !== 'string' || !text.trim()) {
            return res.status(400).json({
                message: 'Task text is required'
            });
        }

        const newTask = new Task({ text });
        const savedTask = await newTask.save();

        res.status(201).json(savedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH: Toggle task completion
app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { completed } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid task ID'
            });
        }

        if (typeof completed !== 'boolean') {
            return res.status(400).json({
                message: 'Completed must be a boolean'
            });
        }

        const updatedTask = await Task.findByIdAndUpdate(
            id,
            { completed },
            { new: true, runValidators: true }
        );

        if (!updatedTask) {
            return res.status(404).json({
                message: 'Task not found'
            });
        }

        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE: Remove a task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid task ID'
            });
        }

        const deletedTask = await Task.findByIdAndDelete(id);

        if (!deletedTask) {
            return res.status(404).json({
                message: 'Task not found'
            });
        }

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Connect to MongoDB and start the server
const startServer = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error(`Database connection failed: ${error.message}`);
        process.exit(1);
    }
};

startServer();
