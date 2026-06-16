import "dotenv/config";
import express from "express";
import cors from "cors";
import donationsRouter from "./routes/donations";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/donations", donationsRouter);

const PORT = Number(process.env["PORT"] ?? 3001);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
