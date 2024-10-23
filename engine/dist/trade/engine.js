"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = exports.BASE_CURRENCY = void 0;
const fs_1 = __importDefault(require("fs"));
const orderbook_1 = require("./orderbook");
const fromApi_1 = require("../types/fromApi");
const RedisManager_1 = require("../RedisManager");
const types_1 = require("../types");
exports.BASE_CURRENCY = 'INR';
class Engine {
    constructor() {
        this.orderbooks = [];
        this.balances = new Map();
        let snapshot = null;
        try {
            if (process.env.WITH_SNAPSHOT) {
                snapshot = fs_1.default.readFileSync("./snapshot.json");
            }
        }
        catch (e) {
            console.log("No snapshot found");
        }
        if (snapshot) {
            const snapshotData = JSON.parse(snapshot.toString());
            this.orderbooks = snapshotData.orderbooks.map((o) => new orderbook_1.Orderbook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice));
            this.balances = new Map(snapshotData.balances);
        }
        else {
            this.orderbooks = [new orderbook_1.Orderbook('TATA', [], [], 0, 0)];
            this.setBaseBalances();
        }
        setInterval(() => {
            this.saveSnapshot();
        }, 1000 * 3);
    }
    saveSnapshot() {
        const snapshotData = {
            orderbooks: this.orderbooks.map(o => o.getSnapshot()),
            balances: Array.from(this.balances.entries())
        };
        fs_1.default.writeFileSync("./snapshot.json", JSON.stringify(snapshotData));
    }
    process({ message, clientId }) {
        switch (message.type) {
            case fromApi_1.CREATE_ORDER:
                try {
                    console.log("Creating order", message.data);
                    const { executedQty, fills, orderId } = this.createOrder(message.data.market, message.data.side, message.data.price, message.data.quantity, message.data.userId);
                    console.log("Order created", orderId);
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_PLACED",
                        payload: {
                            orderId,
                            executedQty,
                            fills
                        }
                    });
                }
                catch (e) {
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId: "",
                            executedQty: 0,
                            remainingQty: 0
                        }
                    });
                }
                break;
            case fromApi_1.CANCEL_ORDER:
                try {
                    const orderId = message.data.orderId;
                    const cancelMarket = message.data.market; //
                    const cancelOrderbook = this.orderbooks.find(o => o.ticker() === cancelMarket);
                    const quoteAsset = cancelMarket.split("_")[1];
                    if (!cancelOrderbook) {
                        throw new Error("Orderbook not found");
                    }
                    const order = cancelOrderbook.asks.find(o => o.orderId === orderId) || cancelOrderbook.bids.find(o => o.orderId === orderId);
                    if (!order) {
                        throw new Error("Order not found");
                    }
                    if (order.side === "buy") {
                        const price = cancelOrderbook.cancelBid(order);
                        const leftQuantity = (order.quantity - order.filled) * order.price;
                        this.balances.get(order.userId)[exports.BASE_CURRENCY].available += leftQuantity;
                        this.balances.get(order.userId)[exports.BASE_CURRENCY].locked -= leftQuantity;
                        if (price) {
                            this.sendUpdatedDepthAt(price.toString(), cancelMarket);
                        }
                    }
                    else {
                        const price = cancelOrderbook.cancelAsk(order);
                        const leftQuantity = order.quantity - order.filled;
                        this.balances.get(order.userId)[quoteAsset].available += leftQuantity;
                        this.balances.get(order.userId)[quoteAsset].locked -= leftQuantity;
                        if (price) {
                            this.sendUpdatedDepthAt(price.toString(), cancelMarket);
                        }
                    }
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId,
                            executedQty: 0,
                            remainingQty: 0,
                        }
                    });
                }
                catch (e) {
                    console.log("error while cancelling order", e);
                }
                break;
            case fromApi_1.GET_OPEN_ORDERS:
                try {
                    const openOrderBook = this.orderbooks.find(o => o.ticker() === message.data.market);
                    if (!openOrderBook) {
                        throw new Error("Orderbook not found");
                    }
                    const openOrder = openOrderBook.getOpenOrders(message.data.userId);
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "OPEN_ORDERS",
                        payload: openOrder
                    });
                }
                catch (e) {
                    console.log("error while getting open orders", e);
                }
                break;
            case fromApi_1.ON_RAMP:
                const userId = message.data.userId;
                const amount = Number(message.data.amount);
                this.onRamp(userId, amount);
                break;
            case fromApi_1.GET_DEPTH:
                try {
                    const market = message.data.market;
                    const orderbook = this.orderbooks.find(o => o.ticker() === market);
                    if (!orderbook) {
                        throw new Error("Orderbook not found");
                    }
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: orderbook.getDepth()
                    });
                }
                catch (e) {
                    console.log("error while getting depth", e);
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: {
                            bids: [],
                            asks: []
                        }
                    });
                }
                break;
        }
    }
    onRamp(userId, amount) {
        const UserBalance = this.balances.get(userId);
        if (!UserBalance) {
            this.balances.set(userId, {
                [exports.BASE_CURRENCY]: {
                    available: amount,
                    locked: 0
                }
            });
        }
        else {
            UserBalance[exports.BASE_CURRENCY].available += amount;
        }
    }
    sendUpdatedDepthAt(price, market) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            return;
        }
        const depth = orderbook.getDepth();
        const updatedBids = depth === null || depth === void 0 ? void 0 : depth.bids.filter(x => x[0] === price);
        const updatedAsks = depth === null || depth === void 0 ? void 0 : depth.asks.filter(x => x[0] === price);
        RedisManager_1.RedisManager.getInstance().publishMessage(`depth@${market}`, {
            stream: `depth@${market}`,
            data: {
                a: updatedAsks.length ? updatedAsks : [[price, "0"]],
                b: updatedBids.length ? updatedBids : [[price, "0"]],
                e: "depth"
            }
        });
    }
    createOrder(market, side, price, quantity, userId) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        const baseAsset = market.split("_")[0];
        const quoteAsset = market.split("_")[1];
        if (!orderbook) {
            throw new Error("Orderbook not found");
        }
        this.checkAndLockFunds(baseAsset, quoteAsset, side, userId, quoteAsset, price, quantity);
        const order = {
            price: Number(price),
            quantity: Number(quantity),
            orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            filled: 0,
            side,
            userId
        };
        const { fills, executedQty } = orderbook.addOrder(order);
        this.updateOrderbookAfterMatch(orderbook, fills, side);
        this.updateBalance(userId, baseAsset, quoteAsset, side, fills, executedQty);
        this.createDbTrades(fills, market, userId);
        this.updateDbOrders(order, executedQty, fills, market);
        this.publisWsDepthUpdates(fills, price, side, market);
        this.publishWsTrades(fills, market, userId);
        return { executedQty, fills, orderId: order.orderId };
    }
    publisWsDepthUpdates(fills, price, side, market) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            return;
        }
        console.log("publish ws depth updates = " + market, price, side, fills);
        const depth = orderbook.getDepth();
        if (side === "buy") {
            const updatedAsks = depth === null || depth === void 0 ? void 0 : depth.asks.filter(x => fills.map(f => f.price).includes(x[0].toString()));
            const updatedBid = depth === null || depth === void 0 ? void 0 : depth.bids.find(x => x[0] === price);
            console.log("publish ws depth updates");
            console.log(`depth.200ms.${market}`);
            RedisManager_1.RedisManager.getInstance().publishMessage(`depth.200ms.${market}`, {
                stream: `depth.200ms.${market}`,
                data: {
                    a: updatedAsks,
                    b: updatedBid ? [updatedBid] : [],
                    e: "depth"
                }
            });
        }
        if (side === "sell") {
            const updatedBids = depth === null || depth === void 0 ? void 0 : depth.bids.filter(x => fills.map(f => f.price).includes(x[0].toString()));
            const updatedAsk = depth === null || depth === void 0 ? void 0 : depth.asks.find(x => x[0] === price);
            console.log("publish ws depth updates");
            console.log(`depth.200ms.${market}`);
            RedisManager_1.RedisManager.getInstance().publishMessage(`depth.200ms.${market}`, {
                stream: `depth.200ms.${market}`,
                data: {
                    a: updatedAsk ? [updatedAsk] : [],
                    b: updatedBids,
                    e: "depth"
                }
            });
        }
    }
    updateOrderbookAfterMatch(orderbook, fills, side) {
        fills.forEach(fill => {
            if (side === "buy") {
                // Remove the filled quantity from the asks
                const askIndex = orderbook.asks.findIndex(ask => ask.price === Number(fill.price));
                if (askIndex !== -1) {
                    orderbook.asks[askIndex].quantity -= fill.qty;
                    if (orderbook.asks[askIndex].quantity <= 0) {
                        orderbook.asks.splice(askIndex, 1);
                    }
                }
            }
            else {
                // Remove the filled quantity from the bids
                const bidIndex = orderbook.bids.findIndex(bid => bid.price === Number(fill.price));
                if (bidIndex !== -1) {
                    orderbook.bids[bidIndex].quantity -= fill.qty;
                    if (orderbook.bids[bidIndex].quantity <= 0) {
                        orderbook.bids.splice(bidIndex, 1);
                    }
                }
            }
        });
        // Optionally, sort the orderbook again if needed
        orderbook.asks.sort((a, b) => a.price - b.price);
        orderbook.bids.sort((a, b) => b.price - a.price);
    }
    publishWsTrades(fills, userId, market) {
        console.log("publish ws trades = " + market, userId, fills);
        fills.forEach(fill => {
            RedisManager_1.RedisManager.getInstance().publishMessage(`trade@${market}`, {
                stream: `trade@${market}`,
                data: {
                    e: "trade",
                    t: fill.tradeId,
                    m: fill.otherUserId === userId, // TODO: Is this right?
                    p: fill.price,
                    q: fill.qty.toString(),
                    s: market,
                }
            });
        });
    }
    updateDbOrders(order, executedQty, fills, market) {
        RedisManager_1.RedisManager.getInstance().pushMessage({
            type: types_1.ORDER_UPDATE,
            data: {
                orderId: order.orderId,
                executedQty,
                market,
                price: order.price.toString(),
                quantity: order.quantity.toString(),
                side: order.side
            }
        });
        fills.forEach(fill => {
            RedisManager_1.RedisManager.getInstance().pushMessage({
                type: types_1.ORDER_UPDATE,
                data: {
                    orderId: fill.markerOrderId,
                    executedQty: fill.qty,
                }
            });
        });
    }
    createDbTrades(fills, market, userId) {
        fills.forEach(fill => {
            RedisManager_1.RedisManager.getInstance().pushMessage({
                type: types_1.TRADE_ADDED,
                data: {
                    market,
                    id: fill.tradeId.toString(),
                    isBuyerMaker: fill.otherUserId === userId,
                    price: fill.price,
                    quantity: fill.qty.toString(),
                    quoteQuantity: (Number(fill.price) * Number(fill.qty)).toString(),
                    timestamp: Date.now()
                }
            });
        });
    }
    updateBalance(userId, baseAsset, quoteAsset, side, fills, executedQty) {
        if (side === "buy") {
            fills.forEach(fill => {
                // Update buyer's quote asset (deducting locked balance)
                const buyerBalance = this.balances.get(userId);
                if (buyerBalance) {
                    buyerBalance[quoteAsset].locked -= Number(fill.price) * Number(fill.qty); // Deduct from locked
                    buyerBalance[quoteAsset].available += Number(fill.price) * Number(fill.qty); // If refund, credit to available (in case of partial fills)
                    // Update buyer's base asset (crediting bought quantity)
                    buyerBalance[baseAsset].available += Number(fill.qty); // Add to available base asset (the asset being bought)
                }
                // Update the seller's balances (fill.otherUserId)
                const sellerBalance = this.balances.get(fill.otherUserId);
                if (sellerBalance) {
                    sellerBalance[quoteAsset].available += Number(fill.price) * Number(fill.qty); // Credit quote asset to the seller
                    sellerBalance[baseAsset].locked -= Number(fill.qty); // Deduct base asset from the seller's locked balance
                }
            });
            // Save the updated state to the snapshot after updating balances
            this.saveSnapshot();
        }
        else {
            // Handle the "sell" logic, which seems correct already
            fills.forEach(fill => {
                const sellerBalance = this.balances.get(userId);
                if (sellerBalance) {
                    sellerBalance[baseAsset].available -= Number(fill.qty);
                    sellerBalance[baseAsset].locked -= Number(fill.qty);
                    sellerBalance[quoteAsset].available += Number(fill.price) * Number(fill.qty);
                }
            });
            // Save snapshot for sell transactions as well
            this.saveSnapshot();
        }
    }
    checkAndLockFunds(baseAsset, quoteAsset, side, userId, asset, price, quantity) {
        var _a, _b, _c, _d;
        console.log("Checking and locking funds", baseAsset, quoteAsset, side, userId, asset, price, quantity);
        if (side === "buy") {
            if ((((_b = (_a = this.balances.get(userId)) === null || _a === void 0 ? void 0 : _a[quoteAsset]) === null || _b === void 0 ? void 0 : _b.available) || 0) < Number(price) * Number(quantity)) {
                throw new Error("Insufficient balance");
            }
            this.balances.get(userId)[quoteAsset].available -= Number(price) * Number(quantity); //
            this.balances.get(userId)[quoteAsset].locked += Number(price) * Number(quantity);
        }
        else {
            if ((((_d = (_c = this.balances.get(userId)) === null || _c === void 0 ? void 0 : _c[baseAsset]) === null || _d === void 0 ? void 0 : _d.available) || 0) < Number(quantity)) {
                throw new Error("Insufficient balance");
            }
            this.balances.get(userId)[baseAsset].available -= Number(quantity);
            this.balances.get(userId)[baseAsset].locked += Number(quantity);
        }
    }
    setBaseBalances() {
        this.balances.set("1", {
            [exports.BASE_CURRENCY]: {
                available: 100000,
                locked: 0
            },
            'TATA': {
                available: 10000,
                locked: 0
            }
        });
        this.balances.set("2", {
            [exports.BASE_CURRENCY]: {
                available: 100000,
                locked: 0
            },
            'TATA': {
                available: 10000,
                locked: 0
            }
        });
        this.balances.set("3", {
            [exports.BASE_CURRENCY]: {
                available: 100000,
                locked: 0
            },
            'TATA': {
                available: 10000,
                locked: 0
            }
        });
        this.balances.set("5", {
            [exports.BASE_CURRENCY]: {
                available: 100000,
                locked: 0
            },
            'TATA': {
                available: 10000,
                locked: 0
            }
        });
    }
    addOrderbook(orderbook) {
        this.orderbooks.push(orderbook);
    }
}
exports.Engine = Engine;
