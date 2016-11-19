require('dotenv').config({silent: true});

var fs          = require('fs');
var parse       = require("csv-parse");
var Promise     = require("bluebird");
var logger      = require('winston');
var mongoose    = require("mongoose");

logger.level = process.env.LOG_LEVEL || "info";

Promise.promisifyAll(fs);
Promise.promisifyAll(mongoose);
mongoose.Promise = Promise;
var parseAsync = Promise.promisify(parse);

var rows = [];
var Price = {};

logger.info("Import " + process.env.PRICE_CSV_FILE);
fs.readFileAsync(process.env.PRICE_CSV_FILE, "utf8").then(data => {
    return parseAsync(data, { delimiter: ";", columns: true });

}).then(csv => {
    logger.info(`CSV loaded. ${csv.length} rows.`);
    rows = csv;

}).then(() => {
    return mongoose.connectAsync(process.env.MONGO_URI);

}).then(e => {
    if (e) throw new Error(e);
    logger.info("Connected to mongodb.");
    Price = require("./models/price.model");
    return Price.remove({});

}).then(() => {
    logger.info("Data cleaned.");
    return Promise.map(rows, row => {
        // normalize data...
        row.product = row.product.trim().toLowerCase();
        row.price = +(row.price.replace(",", "."));
        // ...and save it
        var price = new Price(row);
        return price.save();
    });

}).then(() => {
    logger.info("Done.");
    process.exit();
});
