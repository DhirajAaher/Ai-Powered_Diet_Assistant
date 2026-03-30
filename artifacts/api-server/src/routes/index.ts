import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import profileRouter from "./profile.js";
import dietRouter from "./diet.js";
import trackerRouter from "./tracker.js";
import openaiRouter from "./openai.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/diet", dietRouter);
router.use("/tracker", trackerRouter);
router.use("/openai", openaiRouter);

export default router;
