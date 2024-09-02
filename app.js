const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin'); // If you have admin routes

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ecommerce')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session middleware
app.use(session({
    secret: 'your_secret_key', // Replace with a strong secret
    resave: false,
    saveUninitialized: false
}));

// Flash messages middleware
app.use(flash());

// Set view engine to EJS
app.set('view engine', 'ejs');

// Make flash messages available to all views
app.use((req, res, next) => {
    res.locals.success_messages = req.flash('success');
    res.locals.error_messages = req.flash('error');
    next();
});

// Routes
app.use('/', userRoutes);
app.use('/admin', adminRoutes); // If you have admin routes

// Start the server
app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
