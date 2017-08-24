var Version = 0
//Force debug until you make UI to toggle it
var debugenabled = true;
if (localStorage.debugenabled == null) {
    localStorage.debugenabled = JSON.stringify(debugenabled);
} else {
    debugenabled = JSON.parse(localStorage.debugenabled);
}
//Socket Handling
//Init server connection
var socket = io();
socket.on('connect', function () {
    console.log("Socket connected!")
});
socket.on('disconnect', function () {
    console.log("Socket disconnected.")
});
socket.on('forceRefresh', function () {
    window.location.reload()
});
engine.init('viewport')



