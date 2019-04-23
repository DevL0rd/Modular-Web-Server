//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
const remote = require('electron').remote;
const dialog = remote.dialog;
var window = remote.getCurrentWindow();

var debug = true;
if (debug) {
    $("#dev-btn").show();
    $("#rld-btn").show();
}
Element.prototype.remove = function () {
    this.parentElement.removeChild(this);
}
//IE support string includes
if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
        'use strict';
        if (typeof start !== 'number') {
            start = 0;
        }
        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}
//IE support array includes
if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, "includes", {
        enumerable: false,
        value: function (obj) {
            var newArr = this.filter(function (el) {
                return el == obj;
            });
            return newArr.length > 0;
        }
    });
}
document.getElementById("min-btn").addEventListener("click", function (e) {
    window.minimize();
});
var wSize
document.getElementById("max-btn").addEventListener("click", function (e) {
    if (!window.isMaximized()) {
        wSize = window.getSize();
        window.maximize();
    } else {
        window.unmaximize();
        window.setSize(wSize.width, wSize.height);
        window.center()
    }
});

document.getElementById("close-btn").addEventListener("click", function (e) {
    window.close();
});

document.getElementById("dev-btn").addEventListener("click", function (e) {
    window.webContents.openDevTools();
});

document.getElementById("rld-btn").addEventListener("click", function (e) {
    stopServer()
    location.reload();
});

document.addEventListener('DOMContentLoaded', function () {
    $("#pageLoadingCover").fadeOut(1000);
});

//PROJECT CODE STARTS HERE

document.getElementById("chooseproject-btn").addEventListener("click", function (e) {
    var path = dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (path) {
        startServer(path[0]);
    }
});
var ipcRenderer = require('electron').ipcRenderer;
var logTimeout
ipcRenderer.on('log', function (event, genHtml) {
    $("#consoleContainer").append(genHtml);
    clearTimeout(logTimeout);
    logTimeout = setTimeout(function () {
        $("#consoleContainer").animate({ scrollTop: $('#consoleContainer').prop("scrollHeight") }, 300);
    }, 300);
});
ipcRenderer.send('registerForHTMLLogging');

function consoleCommand(command) {
    ipcRenderer.send('consoleCommand', command);
}

function startServer(path) {
    ipcRenderer.send('openProject', path);

}

function stopServer() {
    ipcRenderer.send('stopServer');
    $("#chooseproject").show(1000);
    $("#serverTools").hide();
}

ipcRenderer.send('getRecents');
ipcRenderer.on('getRecents', function (event, recents) {
    console.log(recents)
    if (recents[0]) {
        $("#recent-1").html(recents[0].name);
        $("#recent-1").click(function () {
            startServer(recents[0].path)
        })
    }
    if (recents[1]) {
        $("#recent-2").html(recents[1].name);
        $("#recent-2").click(function () {
            startServer(recents[1].path)
        })
    }
    if (recents[2]) {
        $("#recent-3").html(recents[2].name);
        $("#recent-3").click(function () {
            startServer(recents[2].path)
        })
    }
});

ipcRenderer.on('openProject', function (event, data) {
    $("#chooseproject").hide();
    $("#serverTools").show(1000);
    setTimeout(function () {
        $('#browser').attr('src', "http://localhost/");
    }, 2000)
});

$("#browser-btn").click(function () {
    $(".toolBoxApp").hide();
    $("#browser").fadeIn(1000);
    $('#browser').attr('src', "http://localhost/");
});
$("#stats-btn").click(function () {
    $(".toolBoxApp").hide();
    $("#stats").fadeIn(1000);
});
$("#plugins-btn").click(function () {
    $(".toolBoxApp").hide();
    $("#plugins").fadeIn(1000);
});
$("#settings-btn").click(function () {
    $(".toolBoxApp").hide();
    $("#settings").fadeIn(1000);
});