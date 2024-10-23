import { Request, Response, Router } from "express";
import { Client } from "pg";

export const klineRouter = Router(); 

const pgClient = new Client({
    user: 'your_user',
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432,
})

pgClient.connect();

klineRouter.get("/", async (req: Request, res: Response):Promise<any> => {
    const { market, interval, startTime, endTime } = req.query;
    console.log(`klineRouter : ${JSON.stringify({ market, interval, startTime, endTime })}`);
    
    let query;
    switch (interval) {
        case "1m":
            query = `SELECT * FROM klines_1m WHERE bucket >= $1 AND bucket <= $2`;
            break;
        case "1h":
            query = `SELECT * FROM klines_1m WHERE bucket >= $1 AND bucket <= $2`;
            break;
        case "1w":
            query = `SELECT * FROM klines_1w WHERE bucket >= $1 AND bucket <= $2`;
            break;
        default:
            return res.status(400).send("Invalid interval");
    }
    try{
        const result  = await pgClient.query(query, [new Date(Number(startTime) * 1000), new Date(Number(endTime) * 1000 as unknown as string) ]); // different from the original code
        res.json(result.rows.map((x: any) => ({
            close: x.close,
            end: x.bucket,
            high: x.high,
            low: x.low,
            open: x.open,
            quoteVolume: x.quoteVolume,
            start: x.start,
            trades: x.trades,
            volume: x.volume
        })));
    } catch (e) {
        console.error(e);
        res.status(500).send("Internal server error At klineRouter" + `${e}`);
    }

})