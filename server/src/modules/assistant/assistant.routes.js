import { Router } from "express";
import { assistantController } from "./assistant.controller.js";

export const assistantRouter = Router();

assistantRouter.post("/analyze", assistantController.analyze);
