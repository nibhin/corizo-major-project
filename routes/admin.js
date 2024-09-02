const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin'); // Import the Admin model
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Payment = require('../models/Payment'); // Make sure the Payment model is imported correctly



// Example of redirect debugging
router.get('/login', (req, res) => {
    console.log('Rendering login page');
    res.render('admin/login');
});
function checkAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.redirect('/admin/login');
    }
}



router.get('/dashboard', (req, res) => {
    if (!req.session.admin) {
        console.log('Redirecting to login because admin is not logged in');
        req.flash('error', 'Please log in');
        return res.redirect('/admin/login');
    }
    console.log('Rendering admin dashboard');
    res.render('admin/dashboard');
});


// Admin Login POST route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find admin by username
        const admin = await Admin.findOne({ username });

        if (!admin) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/admin/login');
        }

        // Set admin session and redirect to dashboard
        req.session.admin = admin;
        res.redirect('/admin/dashboard'); // Redirect to dashboard
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error', 'An error occurred');
        return res.redirect('/admin/login');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect('/admin/login');
    });
});

// Add Product GET route
router.get('/add-product', (req, res) => {
    if (!req.session.admin) {
        req.flash('error', 'Please log in');
        return res.redirect('/admin/login');
    }
    res.render('admin/add-product');
});
router.get('/view-products', async (req, res) => {
    if (!req.session.admin) {
        req.flash('error', 'Please log in');
        return res.redirect('/admin/login');
    }

    try {
        const products = await Product.find();
        res.render('admin/view-products', { products });
    } catch (err) {
        console.error('Error fetching products:', err);
        req.flash('error', 'An error occurred');
        res.redirect('/admin/view-products');
    }
});


// Route to view transactions
router.get('/view-transactions', checkAdmin, async (req, res) => {
    try {
        // Fetch all payments from MongoDB
        const payments = await Payment.find()
            .populate('userId', 'username') // Populate user details if needed
            .populate('orderId', '_id') // Populate order details if needed
            .exec();

        // Render transactions.ejs with payments data
        res.render('admin/transactions', { payments: payments });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Error fetching transactions');
    }
});


// Add Product POST route
router.post('/add-product', async (req, res) => {
    if (!req.session.admin) {
        req.flash('error', 'Please log in');
        return res.redirect('/admin/login');
    }

    const { name, price, description, imageUrl } = req.body;
    try {
        const product = new Product({ name, price, description, imageUrl });
        await product.save();
        res.redirect('/admin/view-products');
    } catch (err) {
        console.error('Error adding product:', err);
        req.flash('error', 'An error occurred while adding the product');
        res.redirect('/admin/add-product');
    }
});

// View Orders
router.get('/view-orders', async (req, res) => {
    if (!req.session.admin) {
        req.flash('error', 'Please log in');
        return res.redirect('/admin/login');
    }

    try {
        const orders = await Order.find().populate('userId products');
        res.render('admin/view-orders', { orders });
    } catch (err) {
        console.error('Error fetching orders:', err);
        req.flash('error', 'An error occurred');
        res.redirect('/admin/view-orders');
    }
});

// View Customers
router.get('/view-customers', async (req, res) => {
    if (!req.session.admin) {
        req.flash('error', 'Please log in');
        return res.redirect('/admin/login');
    }

    try {
        const users = await User.find();
        res.render('admin/view-customers', { users });
    } catch (err) {
        console.error('Error fetching customers:', err);
        req.flash('error', 'An error occurred');
        res.redirect('/admin/view-customers');
    }
});

module.exports = router;
