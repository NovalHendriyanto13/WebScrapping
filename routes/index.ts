import express from "express";
import shopeeRoute from "./shopee/shopee.route";

const router = express.Router();

router.use("/shopee", shopeeRoute);

export default router;