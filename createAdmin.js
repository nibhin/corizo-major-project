const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin'); // Adjust path as needed

mongoose.connect('mongodb://localhost:27017/ecommerce').then(async () => {
    console.log('Connected to MongoDB');

    const username = 'admin'; // Change this to your desired username
    const password = 'password'; // Change this to your desired password

    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
        console.log('Admin user already exists');
        return mongoose.disconnect();
    }

    const salt = await bcrypt.genSalt(10); // Ensure consistent salt rounds
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('Hashed Password:', hashedPassword); // Print hashed password for verification

    const admin = new Admin({
        username,
        password: hashedPassword
    });

    await admin.save();
    console.log('Admin user created successfully');
    mongoose.disconnect();
}).catch(err => {
    console.error('Error connecting to MongoDB:', err);
});
