
const DB = require('./Devlord_modules/DB.js');
const fs = require('fs');
// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 500,
    'min-height': 200,
    'min-width': 400,
    webPreferences: {
      nodeIntegration: true
    },
    transparent: true,
    frame: false
  })
  mainWindow.setMenu(null);
  // and load the index.html of the app.
  mainWindow.loadFile('index.html');
  //fix transparency bug in windows 10
  mainWindow.reload();
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () { setTimeout(createWindow, 300) });

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

app.on('browser-window-created', function (e, window) {
  window.setMenu(null);
});

//Your APP Code Here
const mws = require('./Server.js');
var AU = require('ansi_up');
var ansi_up = new AU.default;
mws.events.on("log", function (nameSpace, text, coloredText) {
  if (htmlLoggingSender) {
    htmlLoggingSender.send('log', ansi_up.ansi_to_html(coloredText) + "<br>");
  }
});

ipcMain.on('consoleCommand', (event, command) => {
  if (mws.commands[command]) {
    mws.commands[command].do(args, fullMessage)
  } else {
    log("Unknown command '" + command + "'.", true, "CONSOLE")
  }
})

var htmlLoggingSender

ipcMain.on('registerForHTMLLogging', (event, arg) => {
  htmlLoggingSender = event.sender
})
if (fs.existsSync("./recents.json")) {
  var recents = DB.load("./recents.json");
} else {
  var recents = [];
  DB.save("./recents.json", recents);
}
function addRecent(projectInformation) {
  if (recents[0] && recents[0].path == projectInformation.path) return;
  if (recents[1] && recents[1].path == projectInformation.path) return;
  if (recents[2] && recents[2].path == projectInformation.path) return;
  recents.push(projectInformation);
  if (recents.length > 3) {
    recents.shift();
  }
  DB.save("./recents.json", recents);

}
ipcMain.on("getRecents", function (event, data) {
  event.sender.send("getRecents", recents);
});

ipcMain.on("openProject", function (event, project) {
  if (mws.init(project)) {
    event.sender.send("openProject");
    addRecent({ name: mws.settings.Name, author: mws.settings.Author, path: mws.settings.projectPath });
  } else {
    event.sender.send("openProjectFail");
    //todo make ui to check
  };
});
