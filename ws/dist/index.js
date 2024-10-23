"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const UserManger_1 = require("./UserManger");
const wss = new ws_1.WebSocketServer({ port: 3001 });
wss.on('connection', (ws) => {
    UserManger_1.UserManager.getInstance().addUser(ws);
});
