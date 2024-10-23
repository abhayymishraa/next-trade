"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const kline_1 = require("./routes/kline");
const order_1 = require("./routes/order");
const depth_1 = require("./routes/depth");
const trades_1 = require("./routes/trades");
const ticker_1 = require("./routes/ticker");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/v1/order', order_1.orderRouter);
app.use('/api/v1/depth', depth_1.depthRouter);
app.use('/api/v1/trades', trades_1.tradeRouter);
app.use('/api/v1/tickers', ticker_1.tickerRouter);
app.use('/api/v1/klines', kline_1.klineRouter);
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
