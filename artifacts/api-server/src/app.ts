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

// Robust Error Handler for /api routes
app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // If headers already sent, truly stop here. Do NOT call next(err).
  // This prevents Express from hitting finalhandler and throwing "cannot 404 after headers sent".
  if (res.headersSent) {
    console.error("[api] Error occurred after headers sent:", err);
    return; 
  }
  
  const status = err.status || err.statusCode || 500;
  console.error(`[api] Error: ${err.message}`, err);
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

// Serve static files from the classroom frontend build
const frontendPath = path.resolve(appDirname, "../../classroom/dist/public");
app.use(express.static(frontendPath));

// Handle SPAs by serving index.html for all other routes
app.get("*splat", (req, res) => {
  // Never serve frontend for API routes
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }

  // Safe file sending with error tracking
  return res.sendFile(path.join(frontendPath, "index.html"), (err) => {
    if (err) {
      // If index.html is missing (e.g. build failed), send a clear JSON error
      // instead of letting it fall through to finalhandler.
      if (!res.headersSent) {
        res.status(404).json({ 
          error: "Frontend not found. Ensure the classroom project is built.",
          path: req.path
        });
      }
    }
  });
});

export default app;
