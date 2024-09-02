const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Admin = require('./models/Admin');
const app = express();
const Payment = require('./models/Payment');

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session setup
app.use(session({
    secret: 'your_secret_key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: false,
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

app.set('view engine', 'ejs');

// Routes
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
app.use('/', userRoutes);
app.use('/admin', adminRoutes);
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
// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ecommerce')
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });

// Start server
app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});