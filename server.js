require('dotenv').config({silent: true});

var appId = process.env.BOT_APP_ID;
if (!appId) {
    console.log("Missing configuration. Exiting.");
    process.exit();
}

console.log("Starting " + appId);

var mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);

var restify = require('restify');
var builder = require('botbuilder');

var bot = new builder.BotConnectorBot({ appId: appId, appSecret: process.env.BOT_APP_SECRET });

bot.on("BotAddedToConversation", function(message) {
    var user = message.participants.filter(u => !u.isBot)[0];
    console.log("Chat with " + user.name);
});

var luis = new builder.LuisDialog(process.env.LUIS_API);

luis.onDefault(function(session) {
    console.log("Hi to " + session.message.from.name + ' (channel=' + session.message.from.channelId + ')');
    session.send("Hi I'm a price bot, ask me about products.");
});

luis.on("get", function(session, args) {
    var msg = session.message.text;
    var intent = args.intents[0];
    var actions = intent.actions.filter(a => a.triggered);
    if (actions.length) {
        var action = actions[0];
        if (action.name == "get") {
            var product = builder.EntityRecognizer.findEntity(args.entities, 'product').entity;
            var discount = builder.EntityRecognizer.findEntity(args.entities, 'builtin.percentage');
            if (discount == null) {
                discount = 0;
            } else {
                discount = +discount.entity.replace(/[^0-9]/g, "");
            }
            
            return session.send("Ok. Sending you the price of %s at %s %% discount.", product, discount);
        }
    }
    
    session.send("Sorry I did not get what you asked me. Try again.");
});

bot.add("/", luis);

var server = restify.createServer();
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
server.listen(process.env.PORT || 8080, process.env.IP || "0.0.0.0", function () {
    console.log('%s listening to %s', server.name, server.url); 
});
