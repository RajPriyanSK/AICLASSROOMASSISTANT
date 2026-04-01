import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";

const appFilename = typeof import.meta !== 'undefined' && import.meta.url
  ? fileURLToPath(import.meta.url)
  : (typeof __filename !== 'undefined' ? __filename : "");
const appDirname = typeof import.meta !== 'undefined' && import.meta.url
  ? path.dirname(appFilename)
  : (typeof __dirname !== 'undefined' ? __dirname : "");

const app: Express = express();

app.use(cors());
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Error handler for /api routes
app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  console.error(`[api] Error: ${err.message}`, err);
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

// Serve static files from the classroom frontend build
const frontendPath = path.resolve(appDirname, "../../classroom/dist/public");
app.use(express.static(frontendPath));

// Handle SPAs by serving index.html for all other routes
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.sendFile(path.join(frontendPath, "index.html"));
});

export default app;
