const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Product = require('../models/Product');
const Order = require('../models/Order');
const flash = require('connect-flash');
const Cart = require('../models/Cart'); // Adjust the path as needed
const Payment=require('../models/Payment');
// Middleware to set flash messages for each response
router.use(flash());

// Route to redirect user based on their session status
router.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Registration Page
router.get('/register', (req, res) => {
    res.render('user/register', {
        success_messages: req.flash('success'),
        error_messages: req.flash('error')
        
    });
});

// Handle Registration
router.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'User already exists');
            return res.redirect('/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            password: hashedPassword,
            email
        });

        await user.save();

        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    } catch (error) {
        console.error('Error registering user:', error);
        req.flash('error', 'An error occurred during registration.');
        res.redirect('/register');
    }
});

// Login Page
router.get('/login', (req, res) => {
    res.render('user/login', {
        success_messages: req.flash('success'),
        error_messages: req.flash('error')
    });
});

// Handle Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.user = user; // Save user in session
            req.flash('success', 'Logged in successfully');
            res.redirect('/dashboard');
        } else {
            req.flash('error', 'Invalid credentials');
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Error during login:', error);
        req.flash('error', 'An error occurred during login.');
        res.redirect('/login');
    }
});

// Dashboard (after login) with products
router.get('/dashboard', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        const products = await Product.find(); // Fetch products
        res.render('user/dashboard', { user: req.session.user, products });
    } catch (error) {
        console.error('Error fetching products for dashboard:', error);
        res.send('Error fetching products');
    }
});

// View My Orders
router.get('/orders', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    try {
        const orders = await Order.find({ userId: req.session.user._id })
            .populate('products.productId')
            .exec();

        console.log('Orders:', JSON.stringify(orders, null, 2)); // Debugging line
        
        res.render('user/orders', { orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
});

// Place Order
router.post('/order', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const { productId } = req.body; // Use destructuring for clarity
    if (!productId) {
        req.flash('error', 'Product ID is missing');
        return res.redirect('/products');
    }
    
    try {
        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        const order = new Order({
            userId: req.session.user._id,
            products: [{ productId, quantity: 1 }] // Default quantity of 1 for single product order
        });

        await order.save();
        req.flash('success', 'Order placed successfully');
        res.redirect('/orders');
    } catch (error) {
        console.error('Error placing order:', error);
        req.flash('error', 'Error placing order');
        res.redirect('/products');
    }
});

// Display all products
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.render('user/product', { products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Specific Product Page
router.get('/product/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('user/product', { product });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).send('Server error');
    }
});

router.get('/cart', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    try {
        // Fetch the cart and populate the productId to get product details
        const userCart = await Cart.findOne({ userId: req.session.user._id }).populate('items.productId');
        
        if (!userCart) {
            return res.render('user/cart', { cart: [], products: [] });
        }

        // Directly use the populated product data
        const cart = userCart.items.map(item => ({
            product: item.productId,
            quantity: item.quantity
        }));

        res.render('user/cart', { cart });
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).send('Server Error');
    }
});

// Add to Cart
router.post('/cart/add/:productId', async (req, res) => {
    const productId = req.params.productId;
    const userId = req.session.user._id;

    try {
        let userCart = await Cart.findOne({ userId });
        if (!userCart) {
            userCart = new Cart({ userId, items: [] });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        const cartItem = userCart.items.find(item => item.productId.toString() === productId);
        if (cartItem) {
            cartItem.quantity += 1;
        } else {
            userCart.items.push({ productId, quantity: 1 });
        }

        await userCart.save();
        res.redirect('/cart');
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).send('Server Error');
    }
});
// Remove from Cart
router.post('/cart/remove/:productId', async (req, res) => {
    const productId = req.params.productId;
    const userId = req.session.user._id;
    try {
        const userCart = await Cart.findOne({ userId });
        if (!userCart) {
            req.flash('error', 'Cart not found');
            return res.redirect('/cart');
        }

        // Remove the product from the cart
        userCart.items = userCart.items.filter(item => item.productId.toString() !== productId);
        await userCart.save();

        req.flash('success', 'Product removed from cart');
        res.redirect('/cart');
    } catch (err) {
        console.error('Error removing item from cart:', err);
        req.flash('error', 'Error removing item from cart');
        res.redirect('/cart');
    }
});


// Place Order for a Single Product
router.post('/cart/placeOrder/:productId', async (req, res) => {
    const productId = req.params.productId;
    const userId = req.session.user._id;

    try {
        const userCart = await Cart.findOne({ userId });
        if (!userCart) {
            req.flash('error', 'Cart not found');
            return res.redirect('/cart');
        }

        // Find the product in the cart
        const cartItem = userCart.items.find(item => item.productId.toString() === productId);
        if (!cartItem) {
            req.flash('error', 'Product not found in cart');
            return res.redirect('/cart');
        }

        // Create a new order with the selected product
        const order = new Order({
            userId,
            products: [{ productId, quantity: cartItem.quantity }]
        });

        await order.save();

        // Remove the item from the cart after placing the order
        userCart.items = userCart.items.filter(item => item.productId.toString() !== productId);
        await userCart.save();

        req.flash('success', 'Order placed successfully');
        res.redirect('/orders');
    } catch (err) {
        console.error('Error placing order:', err);
        req.flash('error', 'Error placing order');
        res.redirect('/cart');
    }
});
router.post('/orders/cancel/:orderId/:productId', async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        // Find the order and remove the specific product
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).send('Order not found');

        order.products = order.products.filter(item => item.productId.toString() !== productId);
        if (order.products.length === 0) {
            await Order.findByIdAndDelete(orderId); // Delete order if no products left
        } else {
            await order.save();
        }

        res.redirect('/orders');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Cancel all orders for the current user
router.post('/orders/cancelAll', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            throw new Error('User not authenticated or user ID not available');
        }
        const userId = req.session.user._id; // Ensure userId is correctly available
        await Order.deleteMany({ userId: userId }); // Delete all orders for the user
        req.flash('success', 'All orders have been cancelled.');
        res.redirect('/orders');
    } catch (err) {
        console.error('Error cancelling all orders:', err);
        req.flash('error', 'Error cancelling all orders');
        res.redirect('/orders');
    }
});


// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login'); // or any other route for unauthenticated users
};

// Apply middleware to routes that require authentication
router.use('/orders', ensureAuthenticated);

router.post('/orders/payment', async (req, res) => {
    const userId = req.session.user._id;

    try {
        const orders = await Order.find({ userId }).populate('products.productId').exec();
        if (orders.length === 0) {
            req.flash('error', 'No orders found to process payment');
            return res.redirect('/orders');
        }

        // Calculate the total cost of the orders
        const totalCost = orders.reduce((sum, order) => {
            return sum + order.products.reduce((orderSum, item) => {
                return orderSum + item.productId.price * item.quantity;
            }, 0);
        }, 0);
        // Create a new payment record for each order
        for (const order of orders) {
            const payment = new Payment({
                userId: userId,
                orderId: order._id,
                amount: totalCost, // Assuming total cost for all orders
            });
            
            await payment.save();
            break; // Save payment to the database
        }

        req.flash('success', 'Payment processed successfully');
        res.render('user/payment', { totalCost });

    } catch (err) {
        console.error('Error processing payment:', err);
        req.flash('error', 'Error processing payment');
        res.redirect('/orders');
    }
});

// Payment Success Page
router.get('/payment/success', (req, res) => {
    res.render('user/payment-success', { deliveryDate: calculateDeliveryDate() });
});

// Utility function to calculate delivery date (example: 5 days from now)
function calculateDeliveryDate() {
    const now = new Date();
    now.setDate(now.getDate() + 5); // Delivery time is 5 days from now
    return now.toDateString();
}



// Logout
router.get('/logout', (req, res) => {
    if (req.session) {
        console.log('Logging out user:', req.session.user);

        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.redirect('/dashboard');
            }

            res.clearCookie('connect.sid'); // Clear session cookie
            console.log('User logged out, session destroyed.');
            res.redirect('/login');
        });
    } else {
        res.redirect('/login');
    }
});

module.exports = router;
