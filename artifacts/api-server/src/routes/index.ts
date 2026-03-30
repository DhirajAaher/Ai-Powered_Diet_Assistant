import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import profileRouter from "./profile.js";
import dietRouter from "./diet.js";
import trackerRouter from "./tracker.js";
import openaiRouter from "./openai.js";
import fastingRouter from "./fasting.js";
import gamificationRouter from "./gamification.js";
import coachRouter from "./coach.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/diet", dietRouter);
router.use("/tracker", trackerRouter);
router.use("/openai", openaiRouter);
router.use("/fasting", fastingRouter);
router.use("/gamification", gamificationRouter);
router.use("/coach", coachRouter);

export default router;
