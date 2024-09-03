const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Admin = require('./models/Admin');
const Payment = require('./models/Payment');
const MongoStore = require('connect-mongo');
const path = require('path'); // Add path module

const app = express();

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public directory

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Use environment variable or default for local development
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }), // Use MongoStore to store sessions in MongoDB
}));

// Flash messages middleware
app.use(flash());

// Passport.js setup for admin authentication
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const admin = await Admin.findOne({ username });
            if (!admin) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, admin);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((admin, done) => {
    done(null, admin.id);
});

passport.deserializeUser((id, done) => {
    Admin.findById(id, (err, admin) => {
        done(err, admin);
    });
});

// Middleware to pass flash messages to templates
app.use((req, res, next) => {
    res.locals.success_messages = req.flash('success');
    res.locals.error_messages = req.flash('error');
    res.locals.currentUser = req.user; // To pass the current user to views
    next();
});

app.set('views', path.join(__dirname, 'views')); // Ensure the views directory path is correct
app.set('view engine', 'ejs');

// Routes
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
app.use('/', userRoutes);
app.use('/admin', adminRoutes);

// Payment processing route
app.post('/process-payment', async (req, res) => {
    try {
        const { userId, orderId, amount } = req.body;

        // Create a new payment
        const newPayment = new Payment({
            userId: userId, // Assuming userId is a valid ObjectId
            orderId: orderId, // Assuming orderId is a valid ObjectId
            amount: amount,
            date: new Date()
        });

        // Save the payment to MongoDB
        await newPayment.save();

        // Redirect or respond with success
        res.redirect('/some-success-page');
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send('Error processing payment');
    }
});
// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
