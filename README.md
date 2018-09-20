# Modular Web Server
This web server was built to be modular, so that functionality can be easily added through plugins!
If I have missed any useful features feel free to let me know, or make a pull request.
  - Completely open source. Go ahead, break things!
  - Built with web apps in mind.
  - Comes with socket.io built in for websocket support through plugins.
  - Completely configurable.
  
## Installation and configuration
Modular Web Server requires [Node.js](https://nodejs.org/) v4+ to run.
- Download the server and extract.
- Install the dependencies.
    ```sh
    cd Modular-Web-Server
    npm install --save
     ```
- Start the server. This will also generate a config file if none exists.
    ```sh
    node server.js 
    ```
    You can optionally specify the path to the project folder when starting the server. By default the web servers root directory will be used.
    
    ```sh
    node server.js "../someProjectFolder"
    ```
- Set Webroot path in config.json to point to your WebRoot
    ```sh
    "webRoot": "./someProjectFolder/Webroot"
    ```
- Other optional configuration can be done in the config file. The configuration is pretty straight forward so I'll skip documenting that here.

## Installing plugins
- Drop your plugins .js file into the plugins folder.
- If the plugin has any dependencies, make sure to install them!

## Creating plugins
Here comes the fun part!
- Adding new commands to the server's console.
    ```javascript
    function init(plugins, settings, events, io, log, commands) {
        commands.testCommand = function () {
            console.log("you did a thing!");
        }
    }
    exports.init = init; //Make sure the init function is exported!!!
    ```
    console commands can also pass parameters.
    ```javascript
    function init(plugins, settings, events, io, log, commands) {
        commands.testCommand = function (fullString, parameters) {
            log(fullString);
            parameters.forEach(function (string){
                log(string);
            });
        }
    }
    exports.init = init;
    ```
- Accessing the server's settings.json file
    ```javascript
    function init(plugins, settings, events, io, log, commands) {
        console.log("The server is running on port '" + settings.port + "'.");
        console.log("The webroot is located at '" + settings.webRoot + "'.");
    }
    exports.init = init;
    ```
- Using the servers namespaces to filter and control logging
    ```javascript
    function init(plugins, settings, events, io, log, commands) {
        // Logging.log(string, isError, Namespace)
        Logging.log("Hello strange world!");
        Logging.log("AHHHH AN ERROR", true);
        Logging.log("Ouch, an error occured in MyPlugin!", true, "MyPlugin");
    }
    exports.init = init;
    ```
- Accessing plugins from another plugin!
    ```javascript
    //Plugin_1.js
    var users = {"someUser": {email:"test@test.test", password:"someEncryptedPassword"}, ...};
    function init(plugins, settings, events, io, log, commands) {
        commands.logSomething = function (){
            console.log("something");
        }
    }
    exports.init = init;
    exports.users = users; //Make sure the users structure is exported

    //Plugin_2.js
    
    function init(plugins, settings, events, io, log, commands) {
        //See, you can get the exported contents of Plugin_1 here
        console.log(plugins["Plugin_1"].users["someUser"].email);
        //You can even use its commands!
        commands.logSomething();
    }
    exports.init = init;
    ```
- Using socket.io in your plugin:
     ```javascript
    function init(plugins, settings, events, io, log, commands) {
        //Someone connects.
        //Note that io.on("connection", ...); is not used. You must use the server event system.
        //Doing it this way will ensure all plugins can use socket.io.
        events.on("connection", function (socket){
            socket.emit("message", "hello client!");
            io.emit("message", "hey everyone, a client connected!");
        });
    }
    exports.init = init;
    exports.users = users; //Make sure the users structure is exported
    ```
## Events and how to use them  
- connection
- disconnect
- post
- get
    
