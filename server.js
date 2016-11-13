require('dotenv').config({silent: true});

var appId = process.env.BOT_NAME;
if (!appId) {
    console.log("Missing configuration. Exiting.");
    process.exit();
}

console.log("Starting " + process.env.BOT_NAME);

var mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);

var restify = require('restify');
var builder = require('botbuilder');

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
    console.log(`Hi to ${user} (channel=${session.message.address.channelId})`);
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
                        .text("Ok. Searching for the price of **%s** at **%s** %% discount.", product, discount)
    session.send(msg);
    session.sendTyping();
    
    setTimeout(function() {
        var msg = new builder.Message(session)
                             .textFormat(builder.TextFormat.markdown)
                             .text("'Here it is: **4€**'");
        session.endDialog(msg);
    }, 10 * 1000);
});

dialog.onDefault("/hello");

// Start server

var server = restify.createServer();
server.post('/api/messages', connector.listen());
server.listen(process.env.PORT || 3978, process.env.IP || "0.0.0.0", function () {
    console.log('%s listening to %s', server.name, server.url); 
});
