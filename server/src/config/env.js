import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number.parseInt(process.env.PORT || "4000", 10),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongoUrl: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/kotiba-ai",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  uzbekVoiceApiKey: process.env.UZBEKVOICE_API_KEY || "",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || ""
};
