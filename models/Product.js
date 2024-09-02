const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    category: String,
    rating: Number,
    description: String,
    stock: Number,
    imageUrl: String
});

module.exports = mongoose.model('Product', productSchema);
