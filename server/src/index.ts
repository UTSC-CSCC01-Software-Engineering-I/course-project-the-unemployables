import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config(); // fallback to local .env if running from server/
import express from "express";
import cors from "cors";
import donationsRouter from "./routes/donations";
import provincesRouter from "./routes/provinces";
import ridingsRouter from "./routes/ridings";
import trendsRouter from "./routes/trends";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/donations", donationsRouter);
app.use("/api/provinces", provincesRouter);
app.use("/api/ridings", ridingsRouter);
app.use("/api/donations", trendsRouter);

const PORT = Number(process.env["PORT"] ?? 3001);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
