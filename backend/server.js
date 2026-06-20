import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/files.js";
import noteRoutes from "./routes/notes.js";

dotenv.config();
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: [
      "https://mvault-nine.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  }),
);
app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res, path, stat) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET");
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/notes", noteRoutes);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 Server running cleanly on port ${PORT}`),
  );
});
