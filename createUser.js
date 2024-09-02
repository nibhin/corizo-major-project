const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // Make sure this path points correctly to your User model

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/ecommerce').then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Error connecting to MongoDB:', err);
});

// Function to create a new user
async function createUser(username, password, email) {
    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log('User already exists');
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const user = new User({
            username: username,
            password: hashedPassword,
            email: email
        });

        // Save the user to the database
        await user.save();
        console.log('User created successfully');
    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        mongoose.connection.close(); // Close the MongoDB connection after the operation
    }
}

// Create a user with your chosen credentials
