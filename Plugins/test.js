//Test Plugin
//DevLord
//Last Update: 10/21/2017
var fs = require('fs');
var DB = require('../Devlord_modules/DB.js');

//Load DBS
if (fs.existsSync("./Engine.json")) {
    var settings = DB.load("./Engine.json")
} else {
    var settings = {
        MaxConnectionCount: -1
    }
    DB.save("Engine", settings)
}

function init(settings, io, log, commands) {
    commands.test = function (message, messageLowercase, arguments) {
        log("Test", false, "Test");
    }
}
module.exports.init = init;
