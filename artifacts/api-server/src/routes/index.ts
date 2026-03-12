import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import lecturesRouter from "./lectures";
import tasksRouter from "./tasks";
import uploadRouter from "./upload";
import questionsRouter from "./questions";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(lecturesRouter);
router.use(tasksRouter);
router.use(uploadRouter);
router.use(questionsRouter);
router.use(chatRouter);

export default router;
