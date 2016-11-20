require('dotenv').config({silent: true});

var appId = process.env.BOT_NAME;
if (!appId) {
    console.log("Missing configuration. Exiting.");
    process.exit();
}

var Promise     = require("bluebird");
var logger      = require('winston');
var mongoose    = require("mongoose");
var restify     = require('restify');
var builder     = require('botbuilder');

logger.level = process.env.LOG_LEVEL || "info";

Promise.promisifyAll(mongoose);
mongoose.Promise = Promise;

logger.info("Starting " + process.env.BOT_NAME);

var Price = require("./models/price.model");

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);

var recognizer = new builder.LuisRecognizer(process.env.LUIS_API);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog("/", dialog);

// Greetings

dialog.matchesAny([/^hi$/i, /^hello$/i, /^bonjour$/i], "/hello");
bot.dialog("/hello", function(session) {
    var user = session.message.user.name || "mister";
    logger.debug(`Hi to ${user} (channel=${session.message.address.channelId})`);
    session.send(`Hi ${user}. I'm a price bot, ask me about products. For example: 'what is the price of E3?'.`);
    session.endDialog();
});

// Language recognition

dialog.matches("GetPrice", function(session, args) {

    var product = builder.EntityRecognizer.findEntity(args.entities, 'product');
    var discount = builder.EntityRecognizer.findEntity(args.entities, 'builtin.percentage');

    if (!product) {
        session.endDialog("Sorry I did not get what you asked me. Try again.");
        return;
    }

    product = product.entity;
    if (discount == null) {
        discount = 0;
    } else {
        discount = +discount.entity.replace(/[^0-9]/g, "");
    }

    var msg = new builder.Message(session)
                        .textFormat(builder.TextFormat.markdown)
                        .text("Ok. Searching for the price of **%s**%s.", product, discount == 0 ? "" : ` at ${discount}% discount`)
    session.send(msg);
    session.sendTyping();

    product = product.trim().toLowerCase().replace(/\s/g, "");

    Price.findOne({ product: product }).select("product A B C D").lean().exec().then(price => {
        if (price) {
            var msg = new builder.Message(session)
                                .textFormat(builder.TextFormat.markdown)
                                .text("**A**: %s€\r\n  **B**: %s€\r\n  **C**: %s€\r\n  **D**: %s€", price.A, price.B, price.C, price.D);
            session.endDialog(msg);
        } else {
            logger.warn("Product not found: " + product);
            session.endDialog("Sorry I don't know this product. Try again.");
        }
    })

});

dialog.onDefault("/hello");

// Start server

mongoose.connect(process.env.MONGO_URI).then(() => {

    logger.info("Starting api server...");
    var server = restify.createServer();
    server.post('/api/messages', connector.listen());
    server.listen(process.env.PORT || 3978, process.env.IP || "0.0.0.0", function () {
        logger.info('%s listening to %s', server.name, server.url); 
    });

});

