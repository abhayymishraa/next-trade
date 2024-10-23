"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
const redis_1 = require("redis");
const UserManger_1 = require("./UserManger");
class SubscriptionManager {
    constructor() {
        this.subscriptions = new Map();
        this.reverseSubscription = new Map();
        this.redisClient = (0, redis_1.createClient)();
        this.redisClient.connect();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }
    subscribe(userId, subscription) {
        var _a, _b;
        if ((_a = this.subscriptions.get(userId)) === null || _a === void 0 ? void 0 : _a.includes(subscription)) {
            return;
        }
        this.subscriptions.set(userId, (this.subscriptions.get(userId) || []).concat(subscription));
        this.reverseSubscription.set(subscription, (this.reverseSubscription.get(subscription) || []).concat(userId));
        if (((_b = this.reverseSubscription.get(subscription)) === null || _b === void 0 ? void 0 : _b.length) === 1) {
            this.redisClient.subscribe(subscription, this.redisCallbackHandler.bind(this));
        }
    }
    redisCallbackHandler(message, channel) {
        var _a;
        const parsedMessage = JSON.parse(message);
        console.log("Received message from redis: ", parsedMessage);
        (_a = this.reverseSubscription.get(channel)) === null || _a === void 0 ? void 0 : _a.forEach((userId) => { var _a; (_a = UserManger_1.UserManager.getInstance().getUser(userId)) === null || _a === void 0 ? void 0 : _a.emit(parsedMessage); });
    }
    unsubscribe(userId, subscription) {
        var _a;
        const subscriptions = this.subscriptions.get(userId);
        if (subscriptions) {
            this.subscriptions.set(userId, subscriptions.filter(e => subscription !== e));
        }
        const reverseSubscriptions = this.reverseSubscription.get(subscription);
        if (reverseSubscriptions) {
            this.reverseSubscription.set(subscription, reverseSubscriptions.filter(s => s !== userId));
            if (((_a = this.reverseSubscription.get(subscription)) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                this.reverseSubscription.delete(subscription);
                this.redisClient.unsubscribe(subscription);
            }
        }
    }
    userLeft(userId) {
        var _a;
        console.log(`User ${userId} left`);
        (_a = this.subscriptions.get(userId)) === null || _a === void 0 ? void 0 : _a.forEach(s => this.unsubscribe(userId, s));
    }
    getSubscriptions(userId) {
        return this.subscriptions.get(userId) || [];
    }
}
exports.SubscriptionManager = SubscriptionManager;
