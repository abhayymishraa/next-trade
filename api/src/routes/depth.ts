import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { GET_DEPTH } from "../types/types";

export const depthRouter = Router();

depthRouter.get("/", async (req, res) => {
    const {symbol} = req.query;
    console.log("Symbol: ", symbol);
    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_DEPTH,
        data: {
            market: symbol as string
        }
    })
    res.json(response.payload);
})