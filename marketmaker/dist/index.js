"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const BaseUrl = "http://localhost:3000";
const TOTAL_BIDS = 15;
const TOTAL_ASKS = 15;
const MARKET = "TATA_INR";
const USER_ID = "5";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const price = 1000 + Math.random() * 10;
        const openOrders = yield axios_1.default.get(`${BaseUrl}/api/v1/order/open?userId=${USER_ID}&market=${USER_ID}`);
        const totalBids = openOrders.data.filter((order) => order.side === "buy").length;
        const totalAsks = openOrders.data.filter((order) => order.side === "sell").length;
        const cancelledBids = yield cancelBidsMoreThan(openOrders.data, price);
        const cancelledAsks = yield cancelAsksMoreThan(openOrders.data, price);
        let bidstoAdd = TOTAL_BIDS - totalBids - cancelledBids;
        let askstoAdd = TOTAL_ASKS - totalAsks - cancelledAsks;
        while (bidstoAdd > 0 || askstoAdd > 0) {
            if (bidstoAdd > 0) {
                yield axios_1.default.post(`${BaseUrl}/api/v1/order`, {
                    market: MARKET,
                    price: (price - Math.random() * 1).toFixed(1).toString(),
                    quantity: "1",
                    side: "buy",
                    userId: USER_ID
                });
                bidstoAdd--;
            }
            else if (askstoAdd > 0) {
                yield axios_1.default.post(`${BaseUrl}/api/v1/order`, {
                    market: MARKET,
                    price: (price + Math.random() * 1).toFixed(1).toString(),
                    quantity: "1",
                    side: "sell",
                    userId: USER_ID
                });
                askstoAdd--;
            }
            yield new Promise((resolve) => setTimeout(resolve, 1000));
            main();
        }
    });
}
function cancelAsksMoreThan(openOrders, price) {
    return __awaiter(this, void 0, void 0, function* () {
        let promises = [];
        openOrders.map(o => {
            if (o.side === "sell" && (o.price < price || Math.random() < 0.1)) {
                promises.push(axios_1.default.delete(`${BaseUrl}/api/v1/order`, {
                    data: {
                        orderId: o.orderId,
                        market: MARKET
                    }
                }));
            }
        });
        Promise.all(promises);
        return promises.length;
    });
}
;
function cancelBidsMoreThan(openOrders, price) {
    return __awaiter(this, void 0, void 0, function* () {
        let promises = [];
        openOrders.map(o => {
            if (o.side === "buy" && (o.price > price || Math.random() < 0.1)) {
                promises.push(axios_1.default.delete(`${BaseUrl}/api/v1/order`, {
                    data: {
                        orderId: o.orderId,
                        market: MARKET,
                    }
                }));
            }
        });
        yield Promise.all(promises);
        return promises.length;
    });
}
main();
