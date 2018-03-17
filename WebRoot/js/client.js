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
    if (!localStorage.doRememberLogin) {
        localStorage.doRememberLogin = true;
    }
    if (!localStorage.doRememberLogin && localStorage.persistentLoginKey) {
        socket.emit('autologin', {
            email: localStorage.email,
            persistentLoginKey: localStorage.persistentLoginKey
        })
    }
});

socket.on('disconnect', function () {

    console.log("Socket disconnected.")
});

socket.on('forceRefresh', function () {
    window.location.reload()
});

socket.on('loginResponse', function (res) {
    if (res == "failed") {
        //could not log in
        $("#loginOutput").html("Invalid credentials.")
        $("#loginOutput").css('color', 'red');
    } else {
        $("#loginOutput").html("Authenticated.")
        $("#loginOutput").css('color', 'green');
        localStorage.persistentLoginKey = res.persistentLoginKey;
        console.log("persistentLoginKey: " + res.persistentLoginKey)
        setTimeout(function () {
            $("#login").fadeOut(400);
            $("#pageCover").fadeOut(600);
        }, 1000)

    }
});
socket.on('registerResponse', function (res) {
    if (res == "emailExists") {
        //email is already registered
        $("#loginOutput").html("This email is already in use.")
        $("#loginOutput").css('color', 'red');
    } else if (res == "registered") {
        //email was succesfully registered
        $("#loginOutput").html("Account created.")
        $("#loginOutput").css('color', 'green');
        $("#login_pswdcheck").hide()
        $("#login_button").text("Login")
        $("#registerLink").show()
        isRegistering = false;
    }
});

socket.on('unregistered', function (res) {
    //account was unregistered.

})

socket.on('forcelogout', function (res) {
    localStorage.persistentLoginKey = "";
    localStorage.email = "";
})
var isRegistering = false;

function register() {
    //verify registration info is valid
    if ($("#login_email").val().length < 6 || !$("#login_email").val().includes("@")) {
        $("#loginOutput").html("Invalid email address.")
        $("#loginOutput").css('color', 'red');
    } else if ($("#login_pswd").val() != $("#login_pswdcheck").val()) {
        $("#loginOutput").html("Passwords do not match.")
        $("#loginOutput").css('color', 'red');
    } else if ($("#login_pswd").val().length < 5) {
        $("#loginOutput").html("Password is less than 5 characters.")
        $("#loginOutput").css('color', 'red');
    } else {
        //send registration info
        socket.emit("register", {
            email: $("#login_email").val(),
            password: $("#login_pswd").val()
        })
    }
}

function logout() {
    localStorage.persistentLoginKey = "";
    localStorage.email = "";
    socket.emit("logout")
}

function login() {
    if ($("#login_email").val().length < 6 || !$("#login_email").val().includes("@")) {
        $("#loginOutput").html("Invalid email address.")
        $("#loginOutput").css('color', 'red');
    } else if ($("#login_pswd").val().length < 5) {
        $("#loginOutput").html("Password is less than 5 characters.")
        $("#loginOutput").css('color', 'red');
    } else {
        localStorage.email = $("#login_email").val();
        socket.emit("login", {
            email: $("#login_email").val(),
            password: $("#login_pswd").val()
        })
    }


}

function loginButton() {
    if (isRegistering) {
        register()
    } else {
        login()
    }
}

function unregister() {
    localStorage.persistentLoginKey = "";
    localStorage.email = "";
    socket.emit("unregister")
    socket.emit("logout")
}

function showRegister() {
    $("#login_pswdcheck").show()
    $("#login_button").text("Register")
    $("#registerLink").hide()
    isRegistering = true;
}
