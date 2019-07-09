//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

//Include Libs
const url = require('url');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const mime = require('mime-types')
const Throttle = require('throttle');
const mkdirp = require('mkdirp');
const slash = require('slash');
const DB = require('./Devlord_modules/DB.js');
const cc = require('./Devlord_modules/conColors.js');
const readdirp = require('readdirp');
var NameSpace = "HTTP";

//
//Include DevLord Libs.
//


function timeStamp() {
    // Create a date object with the current time
    var now = new Date();

    // Create an array with the current month, day and time
    var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];

    // Create an array with the current hour, minute and second
    var time = [now.getHours(), now.getMinutes(), now.getSeconds()];

    // Determine AM or PM suffix based on the hour
    var suffix = (time[0] < 12) ? "AM" : "PM";

    // Convert hour from military time
    time[0] = (time[0] < 12) ? time[0] : time[0] - 12;

    // If hour is 0, set it to 12
    time[0] = time[0] || 12;

    // If seconds and minutes are less than 10, add a zero
    for (var i = 1; i < 3; i++) {
        if (time[i] < 10) {
            time[i] = "0" + time[i];
        }
    }

    // Return the formatted string
    return date.join("/") + " " + time.join(":") + " " + suffix;
}

function isEven(n) {
    n = Number(n);
    return n === 0 || !!(n && !(n % 2));
}

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function formatAndColorString(NameSpaceStr, str, isError) {
    var formattedPrefixColored = cc.style.bright + cc.fg.white + "[" + cc.fg.blue + timeStamp() + cc.fg.white + "] (" + cc.fg.magenta + NameSpaceStr + cc.fg.white + "): ";
    var loggedStrColor = cc.fg.white;
    if (isError) loggedStrColor = cc.fg.red;
    var cstringColoredQuotes = str.replace(/\'.*\'/, cc.style.underscore + cc.fg.cyan + '$&' + cc.reset + cc.style.bright + loggedStrColor);
    return formattedPrefixColored + loggedStrColor + cstringColoredQuotes + cc.reset + cc.fg.white;
}

function formatStringNoColor(str, NameSpaceStr) {
    var formattedString = "[" + timeStamp() + "] (" + NameSpaceStr + "): " + str;
    return "\r\n" + formattedString;
}
function log(str, isError = false, NameSpaceStr = NameSpace) {
    NameSpace = NameSpaceStr;
    setTimeout(function () {

        var colorStr = formatAndColorString(NameSpaceStr, str, isError);
        var formattedString = formatStringNoColor(str, NameSpaceStr);
        str = "" + str;
        if (isError) {
            if (settings.logging.printErrors && !settings.logging.errorNamespacePrintFilter.includes(NameSpaceStr)) {
                console.log(colorStr);
                for (i in events["log"]) {
                    events["log"][i](NameSpaceStr, formattedString, colorStr);
                }
            }
        } else {
            if (settings.logging.printConsole && !settings.logging.consoleNamespacePrintFilter.includes(NameSpaceStr)) {
                console.log(colorStr);
                for (i in events["log"]) {
                    if (events["log"][i](NameSpaceStr, formattedString, colorStr)) {
                        events["log"][i](NameSpaceStr, formattedString, colorStr);
                    }
                }
            }
        }

        if (settings.logging.enabled) {
            var now = new Date();
            var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
            var TodaysDate = date.join("-");
            if (settings.logging.consoleLoggingEnabled) {
                fs.appendFile(settings.logging.directory + "/" + NameSpaceStr + "_C-Out_" + TodaysDate + ".txt", formattedString, function (err) { });
                fs.appendFile(settings.logging.directory + "/" + "C-Out_" + TodaysDate + ".txt", formattedString, function (err) { });
            }
            if (settings.logging.errorLoggingEnabled) {
                fs.appendFile(settings.logging.directory + "/" + "E-Out_" + TodaysDate + ".txt", formattedString, function (err) { });
                fs.appendFile(settings.logging.directory + "/" + NameSpaceStr + "_E-Out_" + TodaysDate + ".txt", formattedString, function (err) { });
            }
        }
    }, 0);
}

var plugins = {};
var server;
var io;
var settings;
var routes;
var redirects;
var ipBans;

function isDirEmpty(dirStr) {
    fs.readdirSync(dirStr, function (err, files) {
        if (err) {
            return false;
        } else {
            if (!files.length) {
                return true;
            } else {
                return false;
            }
        }
    });
}
function loadProjectFile(projectPath) {
    if (fs.existsSync(projectPath + "/MWSProject.json")) {
        settings = DB.load(projectPath + "/MWSProject.json")
    } else {
        settings = {
            Name: "New Webserver App",
            Author: "",
            IP: "0.0.0.0",
            PORT: 80,
            timeout: 5000,
            maxHeadersCount: 20,
            maxPostSizeMB: 8,
            maxUrlLength: 2048,
            directoryIndex: ["index.html"],
            webRoot: projectPath + "/WebRoot",
            pluginsPath: projectPath + "/Plugins",
            throttling: {
                videoBitRateKB: 51000,
                audioBitRateKB: 230,
                applicationDownloadThrottleMB: 15,
            },
            defaultHeaders: {
                "Cache-Control": "max-age=0",
                "X-Frame-Options": "SAMEORIGIN",
                "X-XSS-Protection": "1; mode=block",
                "X-Content-Type-Options": "nosniff"
            },
            security: {
                hotlinkProtection: {
                    enabled: false,
                    domains: ["localhost"],
                    allowedExtensions: ["htm", "html"]
                },
                blockedPaths: [],
                blockedFiles: [],
                blockedFileNames: [],
                blockedFileExtensions: []
            },
            logging: {
                enabled: true,
                directory: projectPath + "/Logs",
                consoleLoggingEnabled: false,
                errorLoggingEnabled: true,
                printConsole: true,
                printErrors: true,
                consoleNamespacePrintFilter: ["HTTP"],
                errorNamespacePrintFilter: []
            }
        }
        DB.save(projectPath + "/MWSProject.json", settings)
    }
    mkdirp(settings.webRoot, function (err) {
        if (err) throw err;
    });
    mkdirp(settings.pluginsPath, function (err) {
        if (err) throw err;
    });
    mkdirp(settings.logging.directory, function (err) {
        if (err) throw err;
    });
    if (fs.existsSync(projectPath + "/routes.json")) {
        routes = DB.load(projectPath + "/routes.json");
    } else {
        routes = {
            GET: {
                "/route/": "/"
            }
        }
        DB.save(projectPath + "/routes.json", routes)
    }

    if (fs.existsSync(projectPath + "/redirects.json")) {
        redirects = DB.load(projectPath + "/redirects.json")
    } else {
        redirects = {
            "/redirect/": "/"
        }
        DB.save(projectPath + "/redirects.json", redirects)
    }

    if (fs.existsSync(projectPath + "/ipBans.json")) {
        ipBans = DB.load(projectPath + "/ipBans.json")
    } else {
        ipBans = {};
        DB.save(projectPath + "/ipBans.json", ipBans)
    }
    //re-export settings
    exports.settings = settings;
}

//get command line args
function init(projectPath = ".") {
    projectPath = slash(projectPath);
    if (!isDirEmpty(projectPath) && !fs.existsSync(projectPath + "/MWSProject.json")) {
        return false;
    }
    loadProjectFile(projectPath);
    settings.projectPath = projectPath; //read only check of path
    server = http.createServer(function (request, response) {
        setTimeout(function () {
            try {
                Http_Handler(request, response);
            } catch (err) {
                response.writeHead(500)
                response.end()
                if (err.message) {
                    log("'" + request.url + "' " + err.message + ".\n" + err.stack, true, "HTTP");
                }
            }
        }, 0)
    })

    server.timeout = settings.timeout;
    server.maxHeadersCount = settings.maxHeadersCount;
    var io = require('socket.io')(server);
    io.connectioncount = 0;
    io.clientcount = 0;
    io.generate_key = function () {
        var sha = crypto.createHash('sha256');
        sha.update(Math.random().toString());
        return sha.digest('hex');
    }
    io.on('error', function (err) {
        log("ERROR: " + err, true, "IO");
    });
    io.on('uncaughtException', function (err) {
        log("ERROR: " + err, true, "IO");
    });
    io.on('connection', function (socket) {
        if (ipBans[socket.request.connection.remoteAddress]) {
            log("[" + socket.request.connection.remoteAddress + "] Rejected!" + " IP address is banned. (" + ipBans[socket.request.connection.remoteAddress].reason + ")", false, "IO");
            socket.disconnect()
            return;
        }
        io.connectioncount++;
        io.clientcount++;
        log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.green + " connected!" + cc.fg.white + " " + io.clientcount + " clients connected.", false, "IO");
        for (i in events["connection"]) {
            events["connection"][i](socket)
        }
        io.emit('connectionCount', io.clientcount)
        socket.on('disconnect', function (data) {
            io.clientcount--;
            log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.yellow + " disconnected..." + cc.fg.white + " " + io.clientcount + " clients connected.", false, "IO");
            for (i in events["disconnect"]) {
                events["disconnect"][i](socket)
            }
            io.emit('connectionCount', io.clientcount)
        });
    })

    server.on('error', function (err) {
        log(err, true, "Server");
    });

    server.on('uncaughtException', function (err) {
        log(err, true, "Server");
    });
    if (settings.pluginsPath && settings.pluginsPath != "") {
        log("Loading plugins...", false, "Server")
        plugins = {};
        readdirp(settings.pluginsPath, {
            type: 'files',
            fileFilter: ['index.js'],
            directoryFilter: ['!.git'],
            depth: 2
        })
            .on('data', (fileInfo) => {
                var folder = fileInfo.fullPath.split("\\index.js")[0];
                if (fs.existsSync(folder + "\\MWSPlugin.json")) {
                    var pluginInfo = DB.load(folder + "\\MWSPlugin.json");
                    plugins[pluginInfo.varName] = { info: pluginInfo, exports: require(fileInfo.fullPath) };
                } else {
                    log("Cold not find MWSPlugin.json for plugin '" + folder + "'.", true, "Server")
                }
            })
            .on('end', () => {
                var pluginExports = {};
                var pLoadList = [];
                for (var i in plugins) {
                    var plugin = plugins[i];
                    pluginExports[plugin.info.varName] = plugin.exports;
                    pLoadList.push(plugin);
                }
                pLoadList.sort((a, b) => (a.info.loadPriority > b.info.loadPriority) ? 1 : -1)
                for (var i in pLoadList) {
                    var plugin = pLoadList[i];
                    log("Plugin '" + plugin.info.name + "' loaded.", false, "Server")
                    plugin.exports.init(pluginExports, settings, events, io, log, commands);
                }
            });
    } else {
        log("To use plugins please configure the directory in 'MWSProject.json'", false, "Server")
    }
    if (settings.webRoot && settings.webRoot != "") {
        log("Starting HTTP server at '" + settings.IP + ":" + settings.PORT + "'...", false, "HTTP");
        server.listen(settings.PORT, settings.IP);
    } else {
        log("ERROR: Please set webroot in 'MWSProject.json'", true, "Server");
        return false;
    }
    return true;
}

function stopServer() {
    server.close();
    log("Server Stopped!", false, "Server");
}

function Http_Handler(request, response) {
    var startTime = new Date().getTime();
    if (ipBans[request.connection.remoteAddress]) {
        log("[" + request.connection.remoteAddress + "] Rejected!" + " IP address is banned. (" + ipBans[request.connection.remoteAddress].reason + ")", "HTTP");
        request.destroy();
        return;
    }
    if (request.url.length >= settings.maxUrlLength) {
        log("[" + request.connection.remoteAddress + "] Uri too long!", true, "HTTP");
        response.writeHead(414)
        response.end()
        return;
    }
    var urlParts = url.parse(request.url);
    var reqPath = decodeURI(urlParts.pathname);
    var requestIsPath = !reqPath.includes(".");
    if (requestIsPath && reqPath.substr(reqPath.length - 1) != "/") {
        response.writeHead(301, {
            'Location': reqPath + "/"
        });
        response.end()
        return;
    }

    if (routes[request.method] && routes[request.method][reqPath]) {
        reqPath = routes[request.method][reqPath]
    }
    if (redirects[reqPath]) {
        response.writeHead(301, {
            'Location': redirects[reqPath]
        });
        response.end()
        return;
    }
    if (request.method == 'POST') {
        var body = '';
        var received = 0;
        request.on('data', function (data) {
            body += data;
            received += data.length;
            if (received > settings.maxPostSizeMB * 1000000) {
                log("[" + request.connection.remoteAddress + "] <POST> '" + reqPath + "' too large!", true, "HTTP");
                request.destroy();
            }
        });
        request.on('end', function () {
            log("[" + request.connection.remoteAddress + "] <POST> '" + reqPath + "'", false, "HTTP");
            for (i in events["post"]) {
                if (events["post"][i](request, response, urlParts, body)) {
                    break;
                }
            }
        });
    } else if (request.method == 'GET') {
        for (i in events["get"]) {
            if (events["get"][i](request, response, urlParts)) {
                return;
            }
        }
        if (requestIsPath) {
            for (i in settings.directoryIndex) {
                testPath = reqPath + "" + settings.directoryIndex[i]
                if (fs.existsSync(settings.webRoot + testPath)) {
                    reqPath = testPath;
                    requestIsPath = false;
                    break;
                }
            }
        }


        var fullPath = settings.webRoot + reqPath
        if (requestIsPath) {
            log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' not found!", true, "HTTP");
            response.writeHead(404);
            response.end();
            return;
        }
        if (isBlocked(reqPath)) {
            log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' ACCESS DENIED! This url is explicitly blocked.", true, "HTTP");
            response.writeHead(403);
            response.end();
            return;
        }
        var extension = reqPath.split('.').pop().toLowerCase()

        if (request.headers['referer']) {
            if (settings.security.hotlinkProtection.enabled && !settings.security.hotlinkProtection.allowedExtensions.includes(extension) && !settings.security.hotlinkProtection.domains.includes(extractHostname(request.headers['referer']))) {
                log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' ACCESS DENIED! Referer not authorized.", true, "HTTP");
                response.writeHead(403);
                response.end();
                return;
            }
        } else if (!settings.security.hotlinkProtection.allowedExtensions.includes(extension) && settings.security.hotlinkProtection.enabled) {
            log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' ACCESS DENIED! Referer header is missing.", true, "HTTP");
            response.writeHead(403);
            response.end();
            return;
        }

        fs.exists(fullPath, function (exists) {
            if (exists) {
                if (request.headers['range']) {
                    sendByteRange(reqPath, request, response, function (start, end) {
                        var executionTime = new Date().getTime() - startTime;
                        log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' byte range " + start + "-" + end + " requested. (" + executionTime + "ms)", false, "HTTP");
                    }, function (start, end) {
                        var executionTime = new Date().getTime() - startTime;
                        log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' byte range " + start + "-" + end + " sent! (" + executionTime + "ms)", false, "HTTP");
                    });
                } else {
                    sendFile(reqPath, request, response, function (isCached) {
                        var executionTime = new Date().getTime() - startTime;
                        if (isCached) {
                            log("[" + request.connection.remoteAddress + "] <GET> (cached) '" + reqPath + "' (" + executionTime + "ms)", false, "HTTP");
                        } else {
                            log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' requested. (" + executionTime + "ms)", false, "HTTP");
                        }
                    }, function (isCached) {
                        var executionTime = new Date().getTime() - startTime;
                        if (!isCached) {
                            log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' sent! (" + executionTime + "ms)", false, "HTTP");
                        }
                    });
                }
            } else {
                log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' not found!", true, "HTTP");
                response.writeHead(404);
                response.end();
                return;
            }
        });
    } else if (request.method == 'BREW') {
        response.writeHead(418)
        response.end()
    } else {
        log("[" + request.connection.remoteAddress + "] <UNKOWN METHOD> '" + request.method + "'", true, "HTTP");
        response.writeHead(501)
        response.end()
    }
}

function sendFile(reqPath, request, response, callback) {
    var fullPath = settings.webRoot + reqPath;
    fs.stat(fullPath, function (err, stat) {
        var reqModDate = request.headers["if-modified-since"];
        //remove milliseconds from modified date, some browsers do not keep the date that accurately.
        if (reqModDate && Math.floor(new Date(reqModDate).getTime() / 1000) == Math.floor(stat.mtime.getTime() / 1000)) {
            response.writeHead(304, {
                "Last-Modified": stat.mtime.toUTCString()
            });
            response.end();
            callback(true);
        } else {
            var mimeType = getMime(reqPath);
            var header = buildHeader(mimeType, stat);
            response.writeHead(200, header);
            var fileStream = fs.createReadStream(fullPath);
            pipeFileToResponse(fileStream, mimeType, response);
            callback(false);
            fileStream.on('end', () => {
            });
        }
    });
}

function buildHeader(mimeType = "application/octet-stream", stat, otherOptions = {}) {
    var contentLength = stat.size;
    var lastModified = stat.mtime.toUTCString();
    var header = {
        'Content-Length': contentLength,
        'Content-Type': mimeType,
        "Last-Modified": lastModified
    };
    header = Object.assign(header, settings.defaultHeaders)
    header = Object.assign(header, otherOptions);
    return header;
}

function sendByteRange(reqPath, request, response, callback) {
    var fullPath = settings.webRoot + reqPath;
    fs.stat(fullPath, function (err, stat) {
        var total = stat.size;
        var range = request.headers.range;
        var parts = range.replace(/bytes=/, "").split("-");
        var partialstart = parts[0];
        var partialend = parts[1];
        var start = parseInt(partialstart, 10);
        var end = partialend ? parseInt(partialend, 10) : total - 1;
        start = isNaN(start) ? 0 : start
        var chunksize = (end - start);
        if (start >= 0 && start <= end && end <= total - 1) {
            var mimeType = getMime(reqPath);
            var header = buildHeader(mimeType, stat, {
                'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                'Content-Length': start == end ? 0 : (end - start + 1),
                'Accept-Ranges': 'bytes'
            });
            response.writeHead(206, header);
            var fileStream = fs.createReadStream(fullPath, {
                start: start,
                end: end
            });
            pipeFileToResponse(fileStream, mimeType, response);

            callback(start, end);
            fileStream.on('end', () => {

            });
        } else {
            log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' Invalid byte range! (" + start + '-' + end + '/' + total + ")", true, "HTTP");
            var header = buildHeader(mimeType, stat, {
                'Content-Range': 'bytes */' + stat.size
            });
            response.writeHead(416, header);
            response.end();
        }
    });
}

function getMime(path) {
    return mime.lookup(path) || 'application/octet-stream';
}

function isBlocked(reqPath) {
    var filename = reqPath.replace(/^.*[\\\/]/, '')
    var directory = reqPath.substring(0, reqPath.lastIndexOf("/"));
    if (settings.security.blockedPaths.includes(directory) || settings.security.blockedFiles.includes(reqPath) || settings.security.blockedFileNames.includes(filename) || settings.security.blockedFileExtensions.includes(reqPath.split('.').pop().toLowerCase())) {
        return true;
    }
    return false;
}

function pipeFileToResponse(fileStream, mimeType, response) {
    var contentCategory = mimeType.split("/")[0]
    if (contentCategory == "video") {
        fileStream.pipe(new Throttle(settings.throttling.videoBitRateKB * 1000)).pipe(response);
    } else if (contentCategory == "audio") {
        fileStream.pipe(new Throttle(settings.throttling.audioBitRateKB * 1000)).pipe(response);
    } else if (contentCategory == "application") {
        fileStream.pipe(new Throttle(settings.throttling.applicationDownloadThrottleMB * 1000000)).pipe(response);
    } else {
        fileStream.pipe(response);
    }
}

process.stdin.on('data', function (line) {
    var fullMessage = line.toString().replace("\r\n", "").replace("\n", "")
    var args = fullMessage.split(" ");
    var fullMessage = fullMessage.substr(fullMessage.indexOf(" ") + 1);
    var command = args.shift().toLowerCase();
    //Commands
    if (commands[command]) {
        commands[command].do(args, fullMessage)
    } else {
        log("Unknown command '" + command + "'.", true, "CONSOLE")
    }
});


var commands = {
    help: {
        usage: "help",
        help: "Displays this command list.",
        do: function (args, fullMessage) {
            for (command in commands) {
                log(command + ":", false, "CONSOLE")
                log("   " + commands[command].usage, false, "CONSOLE")
                log("   " + commands[command].help, false, "CONSOLE")
            }
        }
    },
    banip: {
        usage: "banip <ipAddress> [reason]",
        help: "Bans an ip address from conecting to server, while optionally providing a reason.",
        do: function (args, fullMessage) {
            if (!args.length || args[0].split(".").length != 4) {
                log("Usage: " + this.usage, true, "CONSOLE")
                return
            }
            var ip = args[0];
            var reason = fullMessage.replace(ip + " ", "").replace(ip, "");
            if (!reason) reason = "No reason provided"
            if (!ipBans[ip]) {
                ipBans[ip] = { reason: reason };
                DB.save(projectPath + "/ipBans.json", ipBans);
                log("IP was added to ban list.", false, "CONSOLE");
            } else {
                log("This ip is already banned for '" + ipBans[ip].reason + "'.", true, "CONSOLE");
            }
        }
    },
    unbanip: {
        usage: "unbanip <ipAddress>",
        help: "Unban an IP address.",
        do: function (args, fullMessage) {
            if (!args.length || args[0].split(".").length != 4) {
                console.log("Usage: " + this.usage);
                return;
            }
            var ip = args[0];
            if (ipBans[ip]) {
                delete ipBans[ip];
                DB.save(projectPath + "/ipBans.json", ipBans);
                log("IP was removed from ban list.", false, "CONSOLE");
            } else {
                log("This IP is not banned.", true, "CONSOLE");
            }
        }
    },
    exit: {
        usage: "exit",
        help: "Shuts the server down gracefully.",
        do: function (args, fullMessage) {
            process.exit();
        }
    }
};
var events = {
    "connection": [],
    "disconnect": [],
    "post": [],
    "get": [],
    "log": [],
    "on": function (event, callback) {
        if (this[event] != null) {
            this[event].push(callback)
        } else {
            log("Event '" + event + "' is not found.", true, "Server")
        }
    }
};

exports.init = init;
exports.stopServer = stopServer;
exports.plugins = plugins;
exports.settings = settings;
exports.events = events;
exports.server = server;
exports.io = io;
exports.log = log;
exports.commands = commands;