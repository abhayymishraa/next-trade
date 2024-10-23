import { Router } from "express";

export const tradeRouter = Router();

tradeRouter.get("/", async (req, res) => {
    const {market} = req.query;
    res.json({ message: "Hello from trade" });
});