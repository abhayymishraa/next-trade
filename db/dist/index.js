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
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const redis_1 = require("redis");
const pgClient = new pg_1.Client({
    user: 'your_user',
    host: 'localhost',
    database: 'my_database',
    port: 5432,
    password: 'your_password'
});
pgClient.connect();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const redisClient = (0, redis_1.createClient)();
        yield redisClient.connect();
        console.log('redis is connected');
        while (true) {
            const response = yield redisClient.brPop('db_processor', 0);
            if (!response) {
            }
            else {
                const data = JSON.parse(response.element);
                if (data.type == "TRADE_ADDED") {
                    console.log(" adding data : " + data);
                    console.log(data.data);
                    console.log(data.type);
                    const price = data.data.price;
                    const timestamp = new Date(data.data.timestamp);
                    const query = 'INSERT INTO tata_prices (time, price) VALUES ($1, $2)';
                    const values = [timestamp, price];
                    yield pgClient.query(query, values);
                }
            }
        }
    });
}
main();
