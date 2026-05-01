import { Router } from "express";
import { currencyController } from "./currency.controller.js";

export const currencyRouter = Router();

currencyRouter.get("/rates", currencyController.rates);
