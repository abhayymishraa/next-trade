"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisManager = void 0;
const redis_1 = require("redis");
class RedisManager {
    constructor() {
        this.client = (0, redis_1.createClient)();
        this.client.connect();
        this.publisher = (0, redis_1.createClient)();
        this.publisher.connect();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new RedisManager();
        }
        return this.instance;
    }
    sendAndAwait(message) {
        return new Promise((resolve) => {
            const id = this.getRandomId();
            console.log("Sending message to engine: ", message);
            console.log("Message id: ", id);
            this.client.subscribe(id, (message) => {
                this.client.unsubscribe(id);
                console.log("Received message from engine: ", message);
                resolve(JSON.parse(message));
            });
            console.log("Publishing message to engine: ", message);
            this.publisher.lPush("message", JSON.stringify({ clientId: id, message }));
        });
    }
    getRandomId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}
exports.RedisManager = RedisManager;
