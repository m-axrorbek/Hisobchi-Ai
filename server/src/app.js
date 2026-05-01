import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { assistantRouter } from "./modules/assistant/assistant.routes.js";
import { currencyRouter } from "./modules/currency/currency.routes.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use("/api/assistant", assistantRouter);
  app.use("/api/currency", currencyRouter);

  return app;
};
