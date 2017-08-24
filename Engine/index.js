var fs = require('fs');
var DB = require('../Devlord_modules/DB.js');
var Logging = require('../Devlord_modules/Logging.js');
Logging.setConsoleLogging(false)
var IO
function load(str) {
	var contents = fs.readFileSync(str).toString();
	return JSON.parse(contents)
}

//Load DBS
if (fs.existsSync("./Engine.json")) {
    var settings = DB.load("./Engine.json")
} else {
	var settings = {
		MaxConnectionCount: -1
	}
	DB.save("Engine", settings)
}



function log(str, isError = false, nameSpace = "Engine"){
	Logging.log(str, isError, nameSpace);
}
function initSocket(socket){
	socket.on('worldUpdate', function (data){
		IO.emit('worldUpdate', data)
		//console.log(JSON.stringify(data))
	})

}

function init(io){
	IO = io
	io.connectioncount = 0;
	
	io.clientcount = 0;
	io.IP_BAN_LIST = [];
	io.world = {};
	//on io connection, setup client data
	io.on('connection', function(socket) {
    //if connection is in ban list then show error and disconnect socket
		if (socket.request.connection.remoteAddress in io.IP_BAN_LIST) {
			log("[" + socket.request.connection.remoteAddress + "] Rejected!" + " IP address is banned. (" + io.IP_BAN_LIST[socket.request.connection.remoteAddress].reason + ")", true, "IO");
			socket.disconnect()
		} else {
			log("[" + socket.request.connection.remoteAddress + "] Connected! ", false, "IO");
			io.connectioncount++
			io.clientcount++
			if (io.clientcount == 1){
				setTimeout(function () {
					socket.emit("host", {})
				}, 500)
				
				
			} else {
				setTimeout(function () {
					socket.emit("client", {})
				}, 500)
				
				
			}
			//generate users sessionID to prevent man in middle
			socket.sessionID = io.generate_key()
			socket.on('disconnect', function(data) {
				log("[" + this.request.connection.remoteAddress + "] Disconnected", false, "IO");
				io.clientcount--
			});
			initSocket(socket);
		}
	});
	
}

exports.init = init;