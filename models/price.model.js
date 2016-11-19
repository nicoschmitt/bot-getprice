var mongoose = require("mongoose");

var schema = mongoose.Schema({
    product: String,
    level: String,
    price: Number
});

module.exports = mongoose.model('Price', schema);
