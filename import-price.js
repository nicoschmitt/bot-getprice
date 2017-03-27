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

let file = process.env.PRICE_CSV_FILE || "prices.csv";
logger.info("Import " + file);
fs.readFileAsync(file, "utf8").then(data => {
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
        row.product = row.product.trim().toLowerCase().replace(/\s/g, "");
        row.A = +(row.A.replace(",", "."));
        row.B = +(row.B.replace(",", "."));
        row.C = +(row.C.replace(",", "."));
        row.D = +(row.D.replace(",", "."));
        // ...and save it
        var price = new Price(row);
        return price.save();
    });

}).then(() => {
    logger.info("Done.");
    
}).catch(e => {
    logger.error(e);

}).finally(() => {
    process.exit();

})
