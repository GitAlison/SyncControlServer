/**
 * Connection / Communications with server
 */ 
let address = 'ws://192.168.1.2:9999'

let Connect = {
    connection: null,
    connection_status: false,


    start: function () {
        this.connection = new WebSocket(address);

        this.connection.onopen = function (e) {
            Connect.connection_status = true;
            console.log("Connection established!");

            document.getElementById("title").innerHTML = "Connected"
        };

        // callback messages
        this.connection.onmessage = function (e) {
            var data = JSON.parse(e.data);
            console.log(data);
        };

        // Closed window
        this.connection.onclose = function (e) {
            console.log("Connection closed!");
            this.connection_status = false;
        };

        // Error window
        this.connection.onerror = function (e) {
            console.log("Connection error!");
            this.connection_status = false;
        };

    },

    sendMessage: function (data) {
        if (this.connection_status === false) return;

        var data = JSON.stringify(data);
        this.connection.send(data);
    },

};

