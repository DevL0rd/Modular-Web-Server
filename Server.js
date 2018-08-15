//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

//Include Libs
var url = require('url');
var os = require('os');
var fs = require('fs');
var http = require('http');
var crypto = require('crypto');
var mime = require('mime-types')
var DB = require('./Devlord_modules/DB.js');
var Throttle = require('throttle');
var mkdirp = require('mkdirp');
//
//Include DevLord Libs.
//
var Logging = require('./Devlord_modules/Logging.js');
Logging.setNamespace('HTTP');
var cc = require('./Devlord_modules/conColors.js');
var cs = require('./Devlord_modules/conSplash.js');
var projectPath = "."
//get command line args
if (process.argv[2]) projectPath = process.argv[2];
if (fs.existsSync(projectPath + "/config.json")) {
    var settings = DB.load(projectPath + "/config.json")
} else {
    var settings = {
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
    DB.save(projectPath + "/config.json", settings)
}
mkdirp(settings.webRoot, function (err) {
    if (err) throw err;
});
mkdirp(settings.pluginsPath, function (err) {
    if (err) throw err;
});
Logging.setLoggingDir(settings.logging.directory);
Logging.setLogging(settings.logging.enabled);
Logging.logConsole(settings.logging.consoleLoggingEnabled);
Logging.logErrors(settings.logging.errorLoggingEnabled);
Logging.printConsole(settings.logging.printConsole);
Logging.printErrors(settings.logging.printErrors);
Logging.setConsoleNamespacePrintFilter(settings.logging.consoleNamespacePrintFilter);
Logging.setErrorNamespacePrintFilter(settings.logging.errorNamespacePrintFilter);

if (fs.existsSync(projectPath + "/routes.json")) {
    var routes = DB.load(projectPath + "/routes.json");
} else {
    var routes = {
        GET: {
            "/route/": "/"
        }
    }
    DB.save(projectPath + "/routes.json", routes)
}

if (fs.existsSync(projectPath + "/redirects.json")) {
    var redirects = DB.load(projectPath + "/redirects.json")
} else {
    var redirects = {
        "/redirect/": "/"
    }
    DB.save(projectPath + "/redirects.json", redirects)
}

if (fs.existsSync(projectPath + "/ipBans.json")) {
    var ipBans = DB.load(projectPath + "/ipBans.json")
} else {
    var ipBans = {};
    DB.save(projectPath + "/ipBans.json", ipBans)
}

var commands = {
    help: {
        usage: "help",
        help: "Displays this command list.",
        do: function (args, fullMessage) {
            var isFirstLoop = true;
            for (command in commands) {
                if (!isFirstLoop) {
                    console.log("");
                } else {
                    isFirstLoop = false;
                }
                console.log(command + ":");
                console.log("   " + commands[command].usage);
                console.log("   " + commands[command].help);
            }
        }
    },
    banip: {
        usage: "banip <ipAddress> [reason]",
        help: "Bans an ip address from conecting to server, while optionally providing a reason.",
        do: function (args, fullMessage) {
            if (!args.length || args[0].split(".").length != 4) {
                console.log("Usage: " + this.usage);
                return
            }
            var ip = args[0];
            var reason = fullMessage.replace(ip + " ", "").replace(ip, "");
            if (!reason) reason = "No reason provided"
            if (!ipBans[ip]) {
                ipBans[ip] = { reason: reason };
                DB.save(projectPath + "/ipBans.json", ipBans);
                console.log("IP was added to ban list.");
            } else {
                console.log("This ip is already banned for '" + ipBans[ip].reason + "'.")
            }
        }
    },
    unbanip: {
        usage: "unbanip <ipAddress>",
        help: "Unban an ip address.",
        do: function (args, fullMessage) {
            if (!args.length || args[0].split(".").length != 4) {
                console.log("Usage: " + this.usage);
                return;
            }
            var ip = args[0];
            if (ipBans[ip]) {
                delete ipBans[ip];
                DB.save(projectPath + "/ipBans.json", ipBans);
                console.log("IP was removed from ban list.");
            } else {
                console.log("This ip is not banned.");
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
    "on": function (event, callback) {
        if (this[event] != null) {
            this[event].push(callback)
        } else {
            Logging.log("Event '" + event + "' is not found.", true, "Server")
        }
    }
};

var server = http.createServer(function (request, response) {
    setTimeout(function () {
        try {
            Http_Handler(request, response);
        } catch (err) {
            response.writeHead(500)
            response.end()
            if (err.message) {
                Logging.log("'" + request.url + "' " + err.message + ".\n" + err.stack, true);
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
    Logging.log("ERROR: " + err, true, "IO");
});
io.on('uncaughtException', function (err) {
    Logging.log("ERROR: " + err, true, "IO");
});
io.on('connection', function (socket) {
    if (ipBans[socket.request.connection.remoteAddress]) {
        Logging.log("[" + socket.request.connection.remoteAddress + "] Rejected!" + " IP address is banned. (" + ipBans[socket.request.connection.remoteAddress].reason + ")", false, "IO");
        socket.disconnect()
        return;
    }
    io.connectioncount++;
    io.clientcount++;
    Logging.log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.green + " connected!" + cc.fg.white + " " + io.clientcount + " clients connected.", false, "IO");
    Logging.setNamespace('Plugin');
    for (i in events["connection"]) {
        events["connection"][i](socket)
    }
    Logging.setNamespace('HTTP');
    io.emit('connectionCount', io.clientcount)
    socket.on('disconnect', function (data) {
        io.clientcount--;
        Logging.log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.yellow + " disconnected..." + cc.fg.white + " " + io.clientcount + " clients connected.", false, "IO");
        Logging.setNamespace('Plugin');
        for (i in events["disconnect"]) {
            events["disconnect"][i](socket)
        }
        Logging.setNamespace('HTTP');
        io.emit('connectionCount', io.clientcount)
    });
})

if (settings.pluginsPath && settings.pluginsPath != "") {
    Logging.log("Loading plugins...", false, "Server")
    var plugins = [];
    fs.readdirSync(settings.pluginsPath).forEach(function (file) {
        if (file.split(".").pop() == "js") {
            plugins[file.split(".").shift()] = require(settings.pluginsPath + "/" + file);
        }
    });
    for (var i in plugins) {
        Logging.log("Plugin '" + i + "' loaded.", false, "Server")
        Logging.setNamespace('Plugin');
        plugins[i].init(plugins, settings, events, io, Logging.log, commands);
        Logging.setNamespace('HTTP');
    }
} else {
    Logging.log("To use plugins please configure the directory in 'config.json'", false, "Server")
}

function Http_Handler(request, response) {
    var startTime = new Date().getTime();
    if (ipBans[request.connection.remoteAddress]) {
        Logging.log("[" + request.connection.remoteAddress + "] Rejected!" + " IP address is banned. (" + ipBans[request.connection.remoteAddress].reason + ")");
        request.destroy();
        return;
    }
    if (request.url.length >= settings.maxUrlLength) {
        Logging.log("[" + request.connection.remoteAddress + "] Uri too long!", true);
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
                Logging.log("[" + request.connection.remoteAddress + "] <POST> '" + reqPath + "' too large!", true);
                request.destroy();
            }
        });
        request.on('end', function () {
            Logging.log("[" + request.connection.remoteAddress + "] <POST> '" + reqPath + "'");
            Logging.setNamespace('Plugin');
            for (i in events["post"]) {
                if (events["post"][i](request, response, urlParts, body)) {
                    Logging.setNamespace('HTTP');
                    break;
                }
            }
            Logging.setNamespace('HTTP');
        });
    } else if (request.method == 'GET') {
        Logging.setNamespace('Plugin');
        for (i in events["get"]) {
            if (events["get"][i](request, response, urlParts)) {
                Logging.setNamespace('HTTP');
                return;
            }
        }
        Logging.setNamespace('HTTP');
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
            Logging.log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' not found!", true);
            response.writeHead(404);
            response.end();
            return;
        }
        if (isBlocked(reqPath)) {
            Logging.log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' ACCESS DENIED! This url is explicitly blocked.", true);
            response.writeHead(403);
            response.end();
            return;
        }
        var extension = reqPath.split('.').pop().toLowerCase()

        if (request.headers['referer']) {
            if (settings.security.hotlinkProtection.enabled && !settings.security.hotlinkProtection.allowedExtensions.includes(extension) && !settings.security.hotlinkProtection.domains.includes(extractHostname(request.headers['referer']))) {
                Logging.log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' ACCESS DENIED! Referer not authorized.", true);
                response.writeHead(403);
                response.end();
                return;
            }
        } else if (!settings.security.hotlinkProtection.allowedExtensions.includes(extension) && settings.security.hotlinkProtection.enabled) {
            Logging.log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' ACCESS DENIED! Referer header is missing.", true);
            response.writeHead(403);
            response.end();
            return;
        }

        fs.exists(fullPath, function (exists) {
            if (exists) {
                if (request.headers['range']) {
                    sendByteRange(reqPath, request, response, function (start, end) {
                        var executionTime = new Date().getTime() - startTime;
                        Logging.log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' byte range " + start + "-" + end + " requested. (" + executionTime + "ms)");
                    }, function (start, end) {
                        var executionTime = new Date().getTime() - startTime;
                        Logging.log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' byte range " + start + "-" + end + " sent! (" + executionTime + "ms)");
                    });
                } else {
                    sendFile(reqPath, request, response, function (isCached) {
                        var executionTime = new Date().getTime() - startTime;
                        if (isCached) {
                            Logging.log("[" + request.connection.remoteAddress + "] <GET> (cached) '" + reqPath + "' (" + executionTime + "ms)");
                        } else {
                            Logging.log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' requested. (" + executionTime + "ms)");
                        }
                    }, function (isCached) {
                        var executionTime = new Date().getTime() - startTime;
                        if (!isCached) {
                            Logging.log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' sent! (" + executionTime + "ms)");
                        }
                    });
                }
            } else {
                Logging.log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' not found!", true);
                response.writeHead(404);
                response.end();
                return;
            }
        });
    } else if (request.method == 'BREW') {
        response.writeHead(418)
        response.end()
    } else {
        Logging.log("[" + request.connection.remoteAddress + "] <UNKOWN METHOD> '" + request.method + "'", true);
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

function buildHeader(mimeType, stat, otherOptions = {}) {
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
            Logging.log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' Invalid byte range! (" + start + '-' + end + '/' + total + ")", true);
            responseHeaders['Content-Range'] = 'bytes */' + stat.size;
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

server.on('error', function (err) {
    Logging.log("ERROR: " + err, true, "Server");
});
server.on('uncaughtException', function (err) {
    Logging.log("ERROR: " + err, true, "Server");
});

function extractHostname(url) {
    var hostname;
    if (url.indexOf("://") > -1) {
        hostname = url.split('/')[2];
    } else {
        hostname = url.split('/')[0];
    }
    hostname = hostname.split(':')[0];
    hostname = hostname.split('?')[0];
    return hostname;
}


if (settings.webRoot && settings.webRoot != "") {
    Logging.log("Starting server at '" + settings.IP + ":" + settings.PORT + "'...", false, "Server");
    server.listen(settings.PORT, settings.IP);
    process.stdin.on('data', function (line) {
        var fullMessage = line.toString().replace("\r\n", "").replace("\n", "")
        var args = fullMessage.split(" ");
        var fullMessage = fullMessage.substr(fullMessage.indexOf(" ") + 1);
        var command = args.shift().toLowerCase();
        //Commands
        if (commands[command]) {
            commands[command].do(args, fullMessage)
        } else {
            Logging.log("Unknown command '" + command + "'.")
        }
    });
} else {
    Logging.log("ERROR: Please set webroot in 'config.json'", true, "Server");
}
