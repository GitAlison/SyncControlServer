const { app, BrowserWindow } = require('electron');
const myip = require('quick-local-ip');
const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const robot = require('robotjs');
const nodePath = require('path');


keys_data = {
    19: 'w',
    20: 's',
    21: 'a',
    22: 'd',

    96: 'k', //CROSS
    97: 'l', //CIRCLE
    99: 'j', //SQUARE
    100: 'i', //TRIAGLE
    102: 'q', //l2
    104: '1', //l2
    103: 'e', //R1
    105: '3', //R2
    107: '4', //R3
    106: '2', //L3

    108: 'b', //START
    82: 'v', // SELECT
    //RIGTH ANALOG COMMING
    400: 't', //UP
    401: 'h', //RIGHT
    402: 'f', //LEFT
    403: 'g', //BOTTOM
}



// Config
const Config = {
    http_port: '9998',
    socket_port: '9999'
};



// Http server
const _app = express();
const server = require('http').Server(_app);
server.listen(Config.http_port);

// WSS server
const wss = new WebSocket.Server({ port: Config.socket_port });

// Console prints
console.log('[SERVER]: WebSocket on: ' + myip.getLocalIP4() + ':' + Config.socket_port); // print websocket ip address
console.log('[SERVER]: HTTP on: ' + myip.getLocalIP4() + ':' + Config.http_port); // print web server ip address

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;


let keysPressed = new Set();
let keyInvoked = new Set();

setInterval(() => {
    keyInvoked.forEach(key => {
        if (!keysPressed.has(key)) {
            robot.keyToggle(keys_data[key], 'up')
        }
    })
}, 50)

setInterval(() => {
    if (keysPressed.size > 0) {

        let string = []

        keysPressed.forEach(key => {
            try {
                string.push(keys_data[key])
                keyInvoked.add(key)
                robot.keyToggle(keys_data[key], 'down')
            } catch (error) {
                console.log('key error')
            }
        })
        mainWindow.webContents.send('sendKeys', { keys: string });
    } else {
        try {
            mainWindow.webContents.send('sendKeys', { keys: "" });
        } catch (error) {

        }
    }

}, 50);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 600,
        acceptFirstMouse: true,
        autoHideMenuBar: true,
        useContentSize: true,
        webPreferences: {
            preload: nodePath.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadURL('http://localhost:9998').then(() => {
        mainWindow.webContents.send('sendSettings', { ip: `ws://${myip.getLocalIP4()}:${Config.socket_port}` });
    })
    mainWindow.focus();

    // mainWindow.setFullScreen(true);

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null
    })
}

app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {

        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

/**
 * EXPRESS
 */
_app.use(bodyParser.urlencoded({
    extended: false
}));

_app.use('/assets', express.static(__dirname + '/www/assets'))

_app.get('/', function (req, res) {
    res.sendFile(__dirname + '/www/index.html');
});



wss.on('connection', function connection(ws, req) {

    ws.on('close', function close() {
        console.log('[SERVER]: Client disconnected.');
    });

    ws.on('message', function incoming(recieveData) {
        console.log('[SERVER] Message:', recieveData);

        try {
            const data = JSON.parse(recieveData)
            const keyEvent = data.keys

            if (keyEvent.keyType == "keydown") {
                const keys = JSON.parse(keyEvent.keys)

                keysPressed = new Set([...keysPressed, ...keys])

            } else if (keyEvent.keyType == "keyup") {
                const keys = JSON.parse(keyEvent.keys)

                key = keys_data[keys[0]]

                if (keyInvoked.has(keys[0])) {
                    keysPressed.delete(...keys)
                    // robot.keyToggle(key, 'up')
                }

            }

        } catch (error) {

        }
        sendAll(recieveData);
    });

    // Send back to client
    function send(data) {
        data = JSON.stringify(data);
        ws.send(data);
    }

    // Send to all clients
    function sendAll(data) {
        data = JSON.stringify(data);

        wss.clients.forEach(function each(client) {
            client.send(data);
        });
    }
});
