//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

//Include Libs
const url = require('url');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
const http = require('http');
const formidable = require('formidable');
const crypto = require('crypto');
const bcrypt = require("bcryptjs");
const mime = require('mime-types')
const Throttle = require('throttle');
const mkdirp = require('mkdirp');
const slash = require('slash');
const chokidar = require('chokidar');
const md5 = require('md5');
var watcher;
const DB = require('./Devlord_modules/DB.js');
const cc = require('./Devlord_modules/conColors.js');
const cs = require('./Devlord_modules/conSplash.js');
const readdirp = require('readdirp');
var NameSpace = "HTTP";


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

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function formatAndColorString(NameSpaceStr, str) {
    var formattedPrefixColored = cc.style.bright + cc.fg.white + "[" + cc.fg.blue + timeStamp() + cc.fg.white + "] (" + cc.fg.magenta + NameSpaceStr + cc.fg.white + "): ";
    var cstringColoredQuotes = str.replace(/\'.*\'/, cc.style.underscore + cc.fg.cyan + '$&' + cc.reset + cc.style.bright + cc.fg.white);
    return formattedPrefixColored + cc.fg.white + cstringColoredQuotes + cc.reset + cc.fg.white;
}

function formatStringNoColor(str, NameSpaceStr) {
    var formattedString = "[" + timeStamp() + "] (" + NameSpaceStr + "): " + str;
    return "\r\n" + formattedString;
}
function log(str, isError = false, NameSpaceStr = NameSpace) {
    NameSpace = NameSpaceStr;
    var colorStr = formatAndColorString(NameSpaceStr, str);
    var formattedString = formatStringNoColor(str, NameSpaceStr);
    str = "" + str;
    if (isError) {
        if (settings.logging.printErrors && !settings.logging.errorNamespacePrintFilter.includes(NameSpaceStr)) {
            console.error(colorStr);
            events.trigger("log", { isError: isError, NameSpaceStr: NameSpaceStr, formattedString: formattedString, colorStr: colorStr });
        }
    } else {
        if (settings.logging.printConsole && !settings.logging.consoleNamespacePrintFilter.includes(NameSpaceStr)) {
            console.log(colorStr);
            events.trigger("log", { isError: isError, NameSpaceStr: NameSpaceStr, formattedString: formattedString, colorStr: colorStr });
        }
    }

    if (settings.logging.enabled) {
        var now = new Date();
        var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
        var TodaysDate = date.join("-");
        if (settings.logging.consoleLoggingEnabled) {
            fs.appendFile(settings.logging.directory + "/" + NameSpaceStr + "_C-Out_" + TodaysDate + ".txt", formattedString, function (err) { if (err) log(err.message + ".\n" + err.stack, true, "Logging"); });
            fs.appendFile(settings.logging.directory + "/" + "C-Out_" + TodaysDate + ".txt", formattedString, function (err) { if (err) log(err.message + ".\n" + err.stack, true, "Logging"); });
        }
        if (settings.logging.errorLoggingEnabled) {
            fs.appendFile(settings.logging.directory + "/" + "E-Out_" + TodaysDate + ".txt", formattedString, function (err) { if (err) log(err.message + ".\n" + err.stack, true, "Logging"); });
            fs.appendFile(settings.logging.directory + "/" + NameSpaceStr + "_E-Out_" + TodaysDate + ".txt", formattedString, function (err) { if (err) log(err.message + ".\n" + err.stack, true, "Logging"); });
        }
    }
}

var plugins = {};
var pluginExports = {};
var server;
var wserver;
var io;
var wio;
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
var projectPath;
function loadProjectFile(nProjectPath) {
    projectPath = nProjectPath;
    if (fs.existsSync(projectPath + "/MWSProject.json")) {
        settings = DB.load(projectPath + "/MWSProject.json")
    } else {
        settings = {
            "Name": "New Webserver App",
            "Author": "",
            "IP": "0.0.0.0",
            "PORT": 80,
            "timeout": 5000,
            "maxHeadersCount": 20,
            "maxPostSizeMB": 8,
            "maxUrlLength": 2048,
            "directoryIndex": ["index.html"],
            "webRoot": projectPath + "/WebRoot",
            "pluginsPath": projectPath + "/Plugins",
            "upload": {
                "enabled": true,
                "limitMB": 0,
                "path": projectPath + "/Uploads"
            },
            "throttling": {
                "videoBitRateKB": 51000,
                "audioBitRateKB": 230,
                "applicationDownloadThrottleMB": 15,
            },
            "defaultHeaders": {
                "Cache-Control": "max-age=0",
                "X-Frame-Options": "SAMEORIGIN",
                "X-XSS-Protection": "1; mode=block",
                "X-Content-Type-Options": "nosniff"
            },
            "security": {
                "hotlinkProtection": {
                    "enabled": false,
                    "domains": ["localhost"],
                    "allowedExtensions": ["htm", "html"]
                },
                "blockedPaths": [],
                "blockedFiles": [],
                "blockedFileNames": [],
                "blockedFileExtensions": []
            },
            "logging": {
                "enabled": true,
                "directory": projectPath + "/Logs",
                "consoleLoggingEnabled": false,
                "errorLoggingEnabled": true,
                "printConsole": true,
                "printErrors": true,
                "consoleNamespacePrintFilter": ["HTTP"],
                "errorNamespacePrintFilter": []
            },
            "clustering": {
                "workerPORT": 8080,
                "enabled": false,
                "clusteredFileSync": false,
                "workerPassword": "$2a$08$QS2m8v3lGwWelBzw2W60UelvKdYLUwjlCNP07.UNnT4r9SsxgcXGK"
            }
        }
        DB.save(projectPath + "/MWSProject.json", settings);
        bcrypt.hash("password ", 8, function (err, hash) {
            if (err) {
                log(err.message + ".\n" + err.stack, true, "bCrypt");
                return;
            }
            settings.clustering.workerPassword = hash;
            DB.save(projectPath + "/MWSProject.json", settings);
        });
    }
    mkdirp(settings.webRoot, function (err) {
        if (err) {
            log(err.message + ".\n" + err.stack, true, "mkdirp");
        };
    });
    mkdirp(settings.pluginsPath, function (err) {
        if (err) {
            log(err.message + ".\n" + err.stack, true, "mkdirp");
        };
    });
    mkdirp(settings.logging.directory, function (err) {
        if (err) {
            log(err.message + ".\n" + err.stack, true, "mkdirp");
        };
    });
    mkdirp(settings.upload.path, function (err) {
        if (err) {
            log(err.message + ".\n" + err.stack, true, "mkdirp");
        };
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
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
var workerIo = { isWorker: false, queueJob: queueJob, workerCount: 0, jobs: {}, doDistributedJob: doDistributedJob, socket: false, io: false }
function queueJob(jobName, data, globalData, callback, trackerId = 0) {
    var d = new Date();
    var jobId = d.getTime() + getRandomInt(1, 999999999);
    workerIo.jobs[jobId] = { jobId: jobId, jobName: jobName, data: data, globalData: globalData, callback: callback, trackerId: trackerId, jobTaken: false, currentJob: false };
    giveJobToAvailableWorker(workerIo.jobs[jobId]);
    return jobId;
}
function giveAvailableJob(workerSocket) {
    for (jobId in workerIo.jobs) {
        var job = workerIo.jobs[jobId]
        if (!job.jobTaken) {
            giveJobToWorker(workerSocket, job);
            return true;
        }
    }
    return false;
}
function giveJobToAvailableWorker(job) {
    var dsockets = workerIo.io.sockets.sockets;
    for (var socketId in dsockets) {
        var workerSocket = dsockets[socketId];
        if (workerSocket.isLoggedIn && !workerSocket.jobId) {
            giveJobToWorker(workerSocket, job);
            return true;
        }
    }
    return false;
}
function giveJobToWorker(workerSocket, job) {
    workerSocket.jobId = job.jobId;
    workerSocket.emit("doJob", job);
    workerIo.jobs[job.jobId].jobTaken = true;
}
var jobGroupTracker = {};
function doDistributedJob(jobName, data, globalData, callback) { //test when home
    var d = new Date();
    var trackerId = d.getTime() + getRandomInt(1, 999999999);;
    var jobDatas = chunkData(data, workerIo.workerCount);
    jobGroupTracker[trackerId] = { callback: callback, jobIds: {}, results: [] };
    for (i in jobDatas) {
        var jobData = jobDatas[i];
        jobGroupTracker[trackerId].jobIds[queueJob(jobName, jobData, globalData, trackJobProgress, trackerId)] = true; //just store the jobs id in and delete when completed job.
    }
}
function trackJobProgress(data) {
    jobGroupTracker[data.trackerId].results.push(data.result);
    delete jobGroupTracker[data.trackerId].jobIds[data.jobId];
    if (!(Object.keys(jobGroupTracker[data.trackerId].jobIds).length)) {
        jobGroupTracker[data.trackerId].callback(jobGroupTracker[data.trackerId].results);
        delete jobGroupTracker[data.trackerId];
    }
}
const arrayToObject = (array, keyField) =>
    array.reduce((obj, item) => {
        obj[item[keyField]] = item
        return obj
    }, {})
function chunkData(arr, chunkCount, balanced = true) {
    var isObject = (typeof arr === 'object')
    if (isObject) arr = Object.values(arr);
    if (chunkCount < 2) return [arr];
    var len = arr.length,
        out = [],
        i = 0,
        size;
    if (len % chunkCount === 0) {
        size = Math.floor(len / chunkCount);
        while (i < len) {
            out.push(arr.slice(i, i += size));
        }
    } else if (balanced) {
        while (i < len) {
            size = Math.ceil((len - i) / chunkCount--);
            out.push(arr.slice(i, i += size));
        }
    } else {
        n--;
        size = Math.floor(len / chunkCount);
        if (len % size === 0)
            size--;
        while (i < size * chunkCount) {
            out.push(arr.slice(i, i += size));
        }
        out.push(arr.slice(size * chunkCount));
    }
    if (isObject) {
        for (i in out) {
            out[i] = arrayToObject(out[i], "id");
        }
    }
    return out;
}
function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};
function downloadFile(from, to, callbackReceived, callbackRename) {
    const file = fs.createWriteStream(to + ".incomplete");
    const request = http.get(from, function (response) {
        if (response.statusCode == 200) {
            response.pipe(file);
            response.on('end', function () {
                callbackReceived();
                fs.rename(to + ".incomplete", to, function (err) {
                    if (err) log(err.message + ".\n" + err.stack, true, "Server");
                    callbackRename();
                });
            })
        }
    });
}
function init(projectPath = ".", workerParams = {}) {
    loadProjectFile(projectPath);
    settings.projectPath = projectPath; //read only check of path
    projectPath = slash(projectPath);
    if (!isDirEmpty(projectPath) && !fs.existsSync(projectPath + "/MWSProject.json")) {
        return false;
    }
    workerIo.isWorker = (Object.keys(workerParams).length);
    if (workerIo.isWorker) {
        log("Starting worker...", false, "Worker");
        var wio = require('socket.io-client');
        var mainServerUrl = "http://" + workerParams.mainServerIp + ":" + settings.clustering.workerPORT;
        workerIo.socket = wio(mainServerUrl, {
            reconnect: true
        });
        workerIo.socket.on("connect", function () {
            log("Worker connected to main server. Authenticating...", false, "Worker");
            workerIo.socket.emit("authenticate", workerParams.password)
        });
        workerIo.socket.on("loginResponse", function (isLogged) {
            if (isLogged) {
                log("Worker authenticated.", false, "Server");
            } else {
                log("Worker failed to authenticate. Password incorrect.", true, "Worker");
            }
        });
        workerIo.socket.on("doJob", function (job) {
            workerIo.socket.emit("doJobConfirm");
            job.wsocket = workerIo.socket;
            job.complete = function (result) {
                this.wsocket.emit("completeJob", { result: result, jobId: this.jobId, trackerId: this.trackerId })
            };
            events.trigger("doJob", job);
        });
        workerIo.socket.on("disconnect", function () {
            workerIo.socket.jobId;
            log("Worker disconnected from main server.", false, "Worker");
        });
        workerIo.socket.on('fileAdd', function (data) {
            var localFilePath = settings.projectPath + "/" + data.path;
            if (!fs.existsSync(localFilePath)) {
                //get file
                log("File '" + data.path + "' added.", false, "Worker");
                downloadFile(mainServerUrl + "/" + data.path, localFilePath, function () {
                }, function () {
                    log("File '" + data.path + "' downloaded.", false, "Worker");
                });
            } else {
                //delete file and add if not main server
            }
        });
        workerIo.socket.on('fileChange', function (data) {
            var localFilePath = settings.projectPath + "/" + data.path;
            if (fs.existsSync(localFilePath)) {
                fs.readFile(localFilePath, function (err, buf) {
                    var lmd5 = md5(buf);
                    if (lmd5 != data.md5) {
                        //get new file if different
                        log("File '" + data.path + "' changed.", false, "Worker");

                        downloadFile(mainServerUrl + "/" + data.path, localFilePath, function () {
                            fs.unlink(localFilePath, function (err) {
                                if (err) {
                                    log(err.message + ".\n" + err.stack, true, "Worker");
                                    return
                                }
                            });
                        }, function () {
                            log("File '" + data.path + "' downloaded.", false, "Worker");
                        });

                    }
                });

            } else {
                log("File '" + data.path + "' changed but is missing, downloading file.", false, "Worker");
                downloadFile(mainServerUrl + "/" + data.path, localFilePath, function () {
                }, function () {
                    log("File '" + data.path + "' downloaded.", false, "Worker");
                });
                //download file if missing
            }
        });
        workerIo.socket.on('fileUnlink', function (data) {
            var localFilePath = settings.projectPath + "/" + data.path;
            if (fs.existsSync(localFilePath)) {
                fs.unlink(localFilePath, function (err) {
                    if (err) {
                        log(err.message + ".\n" + err.stack, true, "Worker");
                        return
                    }
                    log("File '" + data.path + "' removed.", false, "Worker");
                });
            }
        });
        workerIo.socket.on('addDir', function (data) {
            var localFilePath = settings.projectPath + "/" + data.path;
            if (!fs.existsSync(localFilePath)) {
                fs.mkdirSync(localFilePath);
                log("Directory '" + data.path + "' added. Sending update to workers", false, "Worker");
            }
        });
        workerIo.socket.on('unlinkDir', function (data) {
            var localFilePath = settings.projectPath + "/" + data.path;

            if (fs.existsSync(localFilePath)) {
                deleteFolderRecursive(localFilePath);
                log("Directory '" + data.path + "' removed.", false, "Worker");
            }
        });
    } else {

        log("Starting master server...", false, "Server");
        //start websocket for distributed networking
        if (settings.clustering.enabled) {
            wserver = http.createServer(function (request, response) {
                if (request.method == 'GET') {
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
                    var fullPath = settings.projectPath + reqPath
                    var extension = reqPath.split('.').pop().toLowerCase()
                    fs.exists(fullPath, function (exists) {
                        if (exists) {
                            if (request.headers['range']) {
                                sendByteRange(fullPath, request, response, function (start, end) {
                                    log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' byte range " + start + "-" + end + " requested.", false, "HTTP");
                                }, function (start, end) {
                                    log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' byte range " + start + "-" + end + " sent!", false, "HTTP");
                                });
                            } else {
                                sendFile(fullPath, request, response, function (isCached) {
                                    if (isCached) {
                                        log("[" + request.connection.remoteAddress + "] <GET> (cached) '" + reqPath + "'.", false, "HTTP");
                                    } else {
                                        log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' requested.", false, "HTTP");
                                    }
                                }, function (isCached) {
                                    if (!isCached) {
                                        log("[" + request.connection.remoteAddress + "] <GET> '" + reqPath + "' sent!", false, "HTTP");
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
                }
            });

            workerIo.io = require('socket.io')(wserver);
            workerIo.io.on('error', function (err) {
                // Handle your error here
                log(err.message + ".\n" + err.stack, true, "IO");
            });
            workerIo.io.on('uncaughtException', function (err) {
                log(err.message + ".\n" + err.stack, true, "IO");
            });
            wserver.listen(settings.clustering.workerPORT, settings.IP);
            wserver.on('error', function (err) {
                // Handle your error here
                log(err.message + ".\n" + err.stack, true, "Server");
            });
            wserver.on('uncaughtException', function (err) {
                log(err.message + ".\n" + err.stack, true, "Server");
            });
            workerIo.io.on("connection", function (ws) {
                ws.jobId = 0;
                log("Worker connected. [" + ws.request.connection.remoteAddress + "]", false, "Server");
                ws.on("authenticate", function (pass) {
                    ws.jobId = 0;
                    bcrypt.compare(pass, settings.clustering.workerPassword, function (err, passMatches) {
                        if (err) {
                            log(err.message + ".\n" + err.stack, true, "bCrypt");
                            return;
                        };
                        if (passMatches) {
                            log("Worker authenticated succesfully. [" + ws.request.connection.remoteAddress + "]", false, "Server");
                            workerIo.workerCount++;
                            ws.isLoggedIn = true;
                            ws.emit("loginResponse", true);
                            giveAvailableJob(ws); //start working
                        } else {
                            log("Worker used incorrect password. [" + ws.request.connection.remoteAddress + "]", true, "Server");
                            ws.emit("loginResponse", false);
                            ws.disconnect();
                        }
                    });
                    events.trigger("workerConnected", ws);
                });

                ws.on("completeJob", function (data) {
                    ws.jobId = 0;
                    workerIo.jobs[data.jobId].callback(data);
                    delete workerIo.jobs[data.jobId]; //cleanup job
                    giveAvailableJob(ws); //get new job if available
                });
                ws.on("disconnect", function () {
                    log("Worker disconnected. [" + ws.request.connection.remoteAddress + "]", false, "Server");
                    if (ws.isLoggedIn) workerIo.workerCount--;
                    ws.isLoggedIn = false; //prevent trying to assign the job back to the same socket
                    if (ws.jobId && workerIo.jobs[ws.jobId]) {
                        workerIo.jobs[ws.jobId].jobTaken = false;
                        giveJobToAvailableWorker(workerIo.jobs[ws.jobId]);
                    }
                });
            });
            if (settings.clustering.clusteredFileSync) {
                log("Clustered server file sync starting up. Scanning...", false, "Server");
                watcher = chokidar.watch(projectPath, {
                    persistent: true,
                    ignored: ['**/*.txt', '.git'],
                    ignoreInitial: true,
                    followSymlinks: true,
                    cwd: projectPath,
                    usePolling: true,
                    interval: 100,
                    binaryInterval: 300,
                    alwaysStat: true,
                    depth: 99,
                    awaitWriteFinish: {
                        stabilityThreshold: 2000,
                        pollInterval: 100
                    },
                    ignorePermissionErrors: true,
                    atomic: true // or a custom 'atomicity delay', in milliseconds (default 100)
                });
                watcher.on('ready', function () {
                    watcher.on('add', function (path, stats) {
                        fs.readFile(settings.projectPath + "/" + path, function (err, buf) {
                            workerIo.io.emit('fileAdd', { path: path, stats: stats, md5: md5(buf) });
                        });
                        log("File '" + path + "' added. Sending update to workers.", false, "Server");
                    });
                    watcher.on('change', function (path, stats) {
                        fs.readFile(settings.projectPath + "/" + path, function (err, buf) {
                            workerIo.io.emit('fileChange', { path: path, stats: stats, md5: md5(buf) });
                        });
                        log("File '" + path + "' modified. Sending update to workers.", false, "Server");
                    });
                    watcher.on('unlink', function (path) {
                        workerIo.io.emit('fileUnlink', { path: path });
                        log("File '" + path + "' removed. Sending update to workers.", false, "Server");
                    });
                    watcher.on('addDir', function (path, stats) {
                        workerIo.io.emit('addDir', { path: path, stats: stats });
                        log("Directory '" + path + "' added. Sending update to workers.", false, "Server");
                    });
                    watcher.on('unlinkDir', function (path) {
                        workerIo.io.emit('unlinkDir', { path: path });
                        log("Directory '" + path + "' removed. Sending update to workers.", false, "Server");
                    });
                    log('Initial scan complete. Ready for changes', false, "Server");
                });
            } else {
                log("Clustered server file sync is disabled.", false, "Server");
            }
            // var workers = os.cpus().length * 2 - 1; //get cpu thread count without current thread
            // log("Starting " + workers + " worker threads...", false, "Server");
            // while (workers > 0) {
            //     var worker = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['start', settings.projectPath, 'worker', '0.0.0.0', "password", { stdio: 'ignore' }]);//make password automagic later
            //     worker.stdout.on('data', (data) => {
            //         // console.log(data.toString());
            //     });
            //     worker.stderr.on('data', (data) => {
            //         console.error(data.toString());
            //     });
            //     worker.on('exit', (code) => {
            //         console.log(`Child exited with code ${code}`);
            //     });
            //     children.push(worker);
            //     workers--;
            // }
        } else {
            log("Server clustering disabled.", false, "Server");
        }
    }

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
        }, 0);
    });
    server.on('error', function (err) {
        // Handle your error here
        log(err.message + ".\n" + err.stack, true, "Server");
    });
    server.on('uncaughtException', function (err) {
        log(err.message + ".\n" + err.stack, true, "Server");
    });
    server.timeout = settings.timeout;
    server.maxHeadersCount = settings.maxHeadersCount;
    io = require('socket.io')(server);
    io.connectioncount = 0;
    io.clientcount = 0;
    io.generate_key = function () {
        var sha = crypto.createHash('sha256');
        sha.update(Math.random().toString());
        return sha.digest('hex');
    }
    io.on('error', function (err) {
        log(err.message + ".\n" + err.stack, true, "IO");
    });
    io.on('uncaughtException', function (err) {
        log(err.message + ".\n" + err.stack, true, "IO");
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
        events.trigger("connection", socket);
        io.emit('connectionCount', io.clientcount)
        socket.on('disconnect', function (data) {
            io.clientcount--;
            log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.yellow + " disconnected..." + cc.fg.white + " " + io.clientcount + " clients connected.", false, "IO");
            events.trigger("disconnect", socket);
            io.emit('connectionCount', io.clientcount)
        });
    })

    if (settings.pluginsPath && settings.pluginsPath != "") {
        log("Loading plugins...", false, "Server");
        plugins = {};
        readdirp(settings.pluginsPath, {
            type: 'files',
            fileFilter: ['index.js'],
            directoryFilter: ['!.git'],
            depth: 2
        })
            .on('data', (fileInfo) => {
                //LINUX SUPPORT
                var folder = fileInfo.fullPath.split("\\index.js")[0];
                if (fs.existsSync(folder + "\\MWSPlugin.json")) {
                    var pluginInfo = DB.load(folder + "\\MWSPlugin.json");
                    // var folder = fileInfo.fullPath.split("/index.js")[0];
                    // if (fs.existsSync(folder + "/MWSPlugin.json")) {
                    //     var pluginInfo = DB.load(folder + "/MWSPlugin.json");
                    pluginInfo["folder"] = folder;
                    pluginInfo["fullPath"] = fileInfo.fullPath;
                    if (!plugins[pluginInfo.varName]) {
                        plugins[pluginInfo.varName] = { info: pluginInfo, exports: require(fileInfo.fullPath) };
                    } else {
                        log("Plugin '" + folder + "' is using a varName (" + pluginInfo.varName + ") already taken by another plugin.", true, "Server")
                    }
                } else {
                    log("Could not find MWSPlugin.json for plugin '" + folder + "'.", true, "Server")
                }
            })
            .on('end', () => {
                pluginExports = {};
                var pLoadList = [];
                for (var i in plugins) {
                    var plugin = plugins[i];
                    pluginExports[plugin.info.varName] = plugin.exports;
                    pLoadList.push(plugin);
                }
                pLoadList.sort((a, b) => (a.info.loadPriority > b.info.loadPriority) ? 1 : -1)
                for (var i in pLoadList) {
                    var plugin = pLoadList[i];
                    if (plugin.info.enabled) {
                        if (workerIo.isWorker) {
                            if (plugin.info.loadWhenInWorkerMode) {
                                log("Plugin '" + plugin.info.name + "' enabled.", false, "Server");
                                plugin.exports.init(pluginExports, settings, events, io, log, commands, workerIo);
                                events.trigger("loadedPlugin", plugin);
                            } else {
                                log("Plugin '" + plugin.info.name + "' is disabled in worker mode.", false, "Server");
                            }
                        } else {
                            log("Plugin '" + plugin.info.name + "' enabled.", false, "Server");
                            plugin.exports.init(pluginExports, settings, events, io, log, commands, workerIo);
                            events.trigger("loadedPlugin", plugin);
                        }
                    } else {
                        log("Plugin '" + plugin.info.name + "' is disabled and not loaded.", false, "Server");
                    }
                }
                events.trigger("loadedPlugins", plugins);
            });
    } else {
        log("To use plugins please configure the directory in 'MWSProject.json'", false, "Server")
    }
    if (settings.webRoot && settings.webRoot != "") {
        log("Starting HTTP server at '" + settings.IP + ":" + settings.PORT + "'...", false, "HTTP");
        if (!workerIo.isWorker) {
            server.listen(settings.PORT, settings.IP);
        }
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
    if (request.method == 'GET') {
        for (i in events["get"]) {
            if (events["get"][i].callback(request, response, urlParts)) {
                return;
            }
        }
        var requestIsPath = !reqPath.includes(".");
        if (requestIsPath && reqPath.substr(reqPath.length - 1) != "/") {
            response.writeHead(301, {
                'Location': reqPath + "/"
            });
            response.end()
            return;
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
                    sendFile(fullPath, request, response, function (isCached) {
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
    } else if (request.method == 'POST') {
        log("[" + request.connection.remoteAddress + "] <POST> '" + reqPath + "'", false, "HTTP");
        for (i in events["post"]) {
            if (events["post"][i].callback(request, response, urlParts)) {
                break;
            }
        }
        if (settings.upload.enabled && request.url == '/upload') {
            handleUpload(request, response, urlParts, reqPath);
        } else {
            log("[" + request.connection.remoteAddress + "] <PUT> '" + reqPath + "' not supported.", true, "HTTP");
            response.writeHead(404);
            response.end();
        }
    } else if (request.method == 'PUT') {
        for (i in events["put"]) {
            if (events["put"][i].callback(request, response, urlParts)) {
                return;
            }
        }
        if (settings.upload.enabled && request.url == '/upload') {
            handleUpload(request, response, urlParts, reqPath);
        } else {
            log("[" + request.connection.remoteAddress + "] <PUT> '" + reqPath + "' not supported.", true, "HTTP");
            response.writeHead(404);
            response.end();
        }
    } else if (request.method == 'BREW') {
        response.writeHead(418);
        response.end();
    } else {
        log("[" + request.connection.remoteAddress + "] <UNKOWN METHOD> '" + request.method + "'", true, "HTTP");
        response.writeHead(501);
        response.end();
    }
}
function handleUpload(request, response, urlParts, reqPath) {
    for (i in events["upload"]) {
        if (events["upload"][i].callback(request, response, urlParts)) {
            return;
        }
    }
    var form = new formidable.IncomingForm();
    var fileSize = Number(request.headers['content-length']);
    var uploadSizeLimitBytes = settings.upload.limitMB * 1000000;
    if (!settings.upload.limitMB || fileSize <= uploadSizeLimitBytes) {
        form.parse(request, function (err, fields, files) {
            for (i in files) {
                var file = files[i];
                for (i in events["uploadComplete"]) {
                    events["uploadComplete"][i].callback(request, response, urlParts, file, fields);
                }
            }
        });
    } else {
        log("[" + request.connection.remoteAddress + "] <" + request.method + "> '" + reqPath + "' file uploaded was too large. (" + fileSize / 1000000 + "MB)", true, "HTTP");
        response.writeHead(413);
        response.end();
    }
}
function sendFile(reqPath, request, response, callback) {
    fs.stat(reqPath, function (err, stat) {
        if (!err) {
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
                var fileStream = fs.createReadStream(reqPath);
                pipeFileToResponse(fileStream, mimeType, response);
                callback(false);
                fileStream.on('end', () => {
                });
            }
        } else {
            log(err.message + ".\n" + err.stack, true, "HTTP");
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

function sendByteRange(fullPath, request, response, callback) {
    fs.stat(fullPath, function (err, stat) {
        if (!err) {
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
                var mimeType = getMime(fullPath);
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
                log("[" + request.connection.remoteAddress + "] <GET> '" + fullPath + "' Invalid byte range! (" + start + '-' + end + '/' + total + ")", true, "HTTP");
                var header = buildHeader(mimeType, stat, {
                    'Content-Range': 'bytes */' + stat.size
                });
                response.writeHead(416, header);
                response.end();
            }
        } else {
            log(err.message + ".\n" + err.stack, true, "HTTP");
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
function reloadPluginExports() {
    pluginExports = {};
    for (var i in plugins) {
        var plugin = plugins[i];
        pluginExports[plugin.info.varName] = plugin.exports;
    }
}
function loadPlugin(fullPath) {
    var folder = fullPath.split("\\index.js")[0];
    if (fs.existsSync(folder + "\\MWSPlugin.json")) {
        var pluginInfo = DB.load(folder + "\\MWSPlugin.json");
        log("Plugin '" + pluginInfo.name + "' is loading....", false, "Server")
        pluginInfo.enabled = true; //Set to enabled because not loaded by init
        DB.save(folder + "\\MWSPlugin.json", pluginInfo); //Save change
        pluginInfo["folder"] = folder;
        pluginInfo["fullPath"] = fullPath;
        if (!plugins[pluginInfo.varName]) {
            plugins[pluginInfo.varName] = { info: pluginInfo, exports: require(fullPath) };
            log("Plugin '" + pluginInfo.name + "' enabled.", false, "Server")
            plugins[pluginInfo.varName].exports.init(pluginExports, settings, events, io, log, commands, workerIo);
            reloadPluginExports();
            events.trigger("loadedPlugin", plugins[pluginInfo.varName]);
        } else {
            log("Plugin '" + folder + "' is using a varName (" + pluginInfo.varName + ") already taken by another plugin.", true, "Server")
        }

    } else {
        log("Could not find MWSPlugin.json for plugin '" + folder + "'.", true, "Server")
    }
}
function unloadPlugin(varName) {
    if (plugins[varName]) {
        var folder = plugins[varName].info.folder;
        var fullPath = plugins[varName].info.fullPath;
        delete plugins[varName].info.folder;
        delete plugins[varName].info.fullPath
        plugins[varName].info.enabled = false; //Set to disabled
        DB.save(folder + "\\MWSPlugin.json", plugins[varName].info); //Save change
        if (plugins[varName].exports.uninit) {
            log("Plugin '" + plugins[varName].info + "' is un-initializing....", false, "Server")
            plugins[varName].exports.uninit(events, io, log, commands);
            events.removeEvents(varName);
            if (deleteModule(fullPath)) {
                log("Plugin '" + varName + "' unloaded!", false, "Server")
                delete plugins[varName];
                reloadPluginExports();
                return true;
            } else {
                log("Plugin '" + varName + "' could not be unloaded!", true, "Server");
                return false;
            };
        } else {
            log("Plugin '" + varName + "' does not support un-loading! You must restart the server to reload this plugin", true, "Server");
        }
    } else {
        log("Could not unload '" + varName + "'. The plugin isn't loaded.", true, "Server")
        return false;
    }
}

function deleteModule(fullPath) {
    var solvedName = require.resolve(fullPath),
        nodeModule = require.cache[solvedName];
    if (nodeModule) {
        for (var i = 0; i < nodeModule.children.length; i++) {
            var child = nodeModule.children[i];
            deleteModule(child.filename);
        }
        delete require.cache[solvedName];
        return true;
    } else {
        return false;
    }
}
function reloadPlugin(pluginName) {
    if (plugins[pluginName]) {
        var pluginPath = plugins[pluginName].info.fullPath
        if (unloadPlugin(pluginName)) {
            loadPlugin(pluginPath);
            log("Plugin reloaded! YOU MAY NEED TO RELOAD OTHER PLUGINS THAT USE THIS PLUGIN!!!!", false, "CONSOLE");
        }
    } else {
        log("Plugin '" + pluginName + "' not found.", false, "CONSOLE");
    }
}
var commands = {
    help: {
        usage: "help",
        help: "Displays this command list.",
        do: function (args, fullMessage) {
            for (command in commands) {
                log(command + ":", false, "CONSOLE");
                log("   " + commands[command].usage, false, "CONSOLE");
                log("   " + commands[command].help, false, "CONSOLE");
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
                log("Usage: " + this.usage, false, "CONSOLE")
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
    reload: {
        usage: "reload <pluginName>",
        help: "Reloads a plugin.",
        do: function (args, fullMessage) {
            if (!args || args.length != 2) {
                var pluginName = args[0];
                reloadPlugin(pluginName);
            } else {
                log("Usage: " + this.usage, false, "CONSOLE")
            }
        }
    },
    setwp: {
        usage: "setwp <password>",
        help: "Sets the password for distributed networking clients.",
        do: function (args, fullMessage) {
            if (!args || args.length != 2) {
                var pass = args[0];
                bcrypt.hash(pass, 8, function (err, hash) {
                    if (err) {
                        log(err.message + ".\n" + err.stack, true, "bCrypt");
                        return;
                    }
                    settings.clustering.workerPassword = hash;
                    DB.save(projectPath + "/MWSProject.json", settings);
                    log("Distributed Networking Worker password set!", false, "CONSOLE");
                });
            } else {
                log("Usage: " + this.usage, false, "CONSOLE");
            }
        }
    },
    replicatefile: {
        usage: "replicatefile <path>",
        help: "Forcefully replicates file to workers.",
        do: function (args, fullMessage) {
            if (!args || args.length != 2) {
                var file = args[0];
                var localFilePath = settings.projectPath + "/" + file;
                if (fs.existsSync(localFilePath)) {
                    var stats = fs.statSync(localFilePath);
                    workerIo.io.emit('fileChange', { path: file, stats: stats });
                    log("File '" + file + "' modified. Sending update to workers.", false, "CONSOLE");
                } else {
                    log("That file does not exist.", false, "CONSOLE");
                }
            } else {
                log("Usage: " + this.usage, false, "CONSOLE");
            }
        }
    },
    replicatefolder: {
        usage: "replicatefolder <path>",
        help: "Forcefully replicates folder to workers.",
        do: function (args, fullMessage) {
            if (!args || args.length != 2) {
                var folder = args[0];
                var localFolderPath = settings.projectPath + "/" + folder;
                if (fs.existsSync(localFolderPath)) {
                    log("This command does not work atm. This will be added later.", false, "CONSOLE");
                } else {
                    log("That folder does not exist.", false, "CONSOLE");
                }
            } else {
                log("Usage: " + this.usage, false, "CONSOLE");
            }
        }
    },
    exit: {
        usage: "exit",
        help: "Shuts the server down gracefully.",
        do: function (args, fullMessage) {
            events.trigger("exit");
            process.exit();
        }
    }
};

var events = {
    "exit": [],
    "connection": [],
    "disconnect": [],
    "get": [],
    "post": [],
    "put": [],
    "upload": [],
    "uploadComplete": [],
    "log": [],
    "loadedPlugin": [],
    "loadedPlugins": [],
    "doJob": [],
    "workerConnected": [],
    "on": function (event, callback, owner) {
        if (!owner) owner = "Server"
        if (this[event] && event != "trigger" && event != "on" && event != "addEvent" && event != "removeEvents") {
            this[event].push({ callback: callback, owner: owner });
        } else {
            log("Event '" + event + "' is not found.", true, "Server");
        }
    },
    "addEvent": function (event) {
        if (event != "trigger" && event != "on" && event != "addEvent" && event != "removeEvents") {
            this[event] = [];
        }
    },
    "trigger": function (event, params = null) {
        if (this[event] && event != "trigger" && event != "on" && event != "addEvent" && event != "removeEvents") {
            for (i in this[event]) {
                this[event][i].callback(params);
            }
        } else {
            log("Event '" + event + "' is not found.", true, "Server");
        }
    },
    "removeEvents": function (owner) {
        for (event in events) {
            for (i in events[event]) {
                if (events[event][i].owner == owner) {
                    events[event].splice(i, 1);
                }
            }
        }
    }
};
var children = [];
var cleanExit = function () {
    console.log('killing', children.length, 'child processes');
    children.forEach(function (child) {
        child.kill();
    });
    process.exit()
};
process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill
process.on('exit', cleanExit); // catch exit signal
exports.init = init;
exports.stopServer = stopServer;
exports.plugins = plugins;
exports.settings = settings;
exports.events = events;
exports.server = server;
exports.io = io;
exports.log = log;
exports.commands = commands;
exports.reloadPlugin = reloadPlugin;
exports.unloadPlugin = unloadPlugin
exports.loadPlugin = loadPlugin