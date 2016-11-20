var mongoose = require("mongoose");

var schema = mongoose.Schema({
    product: String,
    A: Number,
    B: Number,
    C: Number,
    D: Number
});

module.exports = mongoose.model('Price', schema);
