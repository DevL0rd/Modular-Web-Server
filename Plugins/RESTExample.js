//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
//Last Update: 3/17/2018
//Version: 1.0.0
function init(settings, events, io, log, commands) {
    events.on("post", function (request, response, body) {
        response.writeHead(200, {
            'Content-Type': 'application/json'
        });
        var reponseData = {
            data: "post received"
        }
        response.end(JSON.stringify(reponseData));
    })
}

module.exports.init = init