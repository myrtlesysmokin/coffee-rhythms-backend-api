// server.js (UPDATED: Using Mongoose for permanent database storage)

// 1. Load dependencies and environment variables
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose'); // <-- NEW: Import Mongoose
const app = express();

// --- Configuration & Environment Variables ---
const PORT = process.env.PORT || 3000;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const MONGO_URI = process.env.MONGO_URI; // <-- NEW: Get MONGO_URI

// --- 1. Mongoose Setup and Database Connection ---
if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
    process.exit(1); // Stop the application if DB connection string is missing
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- 2. Subscriber Schema (Defines the structure of saved data) ---
// Ito ang magiging format ng data sa iyong database
const subscriberSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true, // Auto-checks for duplicate emails
    },
    subscribedAt: {
        type: Date,
        default: Date.now,
    }
});
const Subscriber = mongoose.model('Subscriber', subscriberSchema);

// --- Middleware ---
app.use(cors({ origin: '*' })); 
app.use(express.json()); 

// --- Nodemailer Transporter Setup (Same as before) ---
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    }
});

// --- API Route: Handle Newsletter Subscription ---
app.post('/subscribe', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
    
    try {
        // Mongoose automatically handles the duplicate check due to unique: true
        const newSubscriber = new Subscriber({ email });
        await newSubscriber.save(); // 1. Save the new email to the MongoDB database
        
        console.log(`New subscriber saved to DB: ${email}`);

        // 2. Ipadala ang confirmation email
        const mailOptions = {
            from: `"Coffee & Rhythms" <${EMAIL_USER}>`, 
            to: email, 
            subject: '☕ Welcome to Coffee & Rhythms!', 
            html: `
                <div style="font-family: Montserrat, sans-serif; color: #4a2c2a; line-height: 1.6;">
                    <h2 style="color: #8b5e3c; border-bottom: 2px solid #c8a379; padding-bottom: 10px;">The Comfort of Pause Awaits.</h2>
                    <p>Thanks for subsccribing! Expect freshly brewed updates, featured artists, and soulful reads delivered straight to your inbox.</p>
                    <p style="margin-top: 20px;">Cheers,<br> Coffee & Rhythms</p>
                </div>
            `,
            text: `Welcome to Coffee & Rhythms! Thank you for subscribing. Cheers, Mich R. Leisibach` 
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ 
            message: 'Subscription successful! Please check your inbox for a confirmation email. 💌'
        });

    } catch (error) {
        // Tinitingnan kung ang error ay dahil sa duplicate email (MongoDB code 11000)
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: 'You are already subscribed to the rhythms! ☕' 
            });
        }
        
        console.error('Error handling subscription:', error);
        res.status(500).json({ 
            message: 'Subscription failed. Please check server logs for details.' 
        });
    }
});

// Basic check route (Same as before)
app.get('/', (req, res) => {
    res.send('Coffee & Rhythms Backend is Running! ☕');
});


// 4. Start the Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});