import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times without risking some
// packages that are not bundle compatible
const allowlist = [
  "@google/generative-ai",
  "@supabase/supabase-js",
  "axios",
  "connect-pg-simple",
  "cookie-parser",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "form-data",
  "groq-sdk",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  console.log("building server...");
  // Bundle everything except Node.js built-ins
  const externals = [
    "node:path", "node:fs", "node:http", "node:https", "node:crypto",
    "node:url", "node:events", "node:stream", "node:os", "node:util",
    "node:zlib", "node:buffer", "node:querystring", "node:diagnostics_channel",
    "path", "fs", "http", "https", "crypto", "url", "events", "stream",
    "os", "util", "zlib", "buffer", "querystring", "net", "tls", "timers", 
    "string_decoder", "async_hooks", "node:async_hooks", "node:net", "node:tls"
  ];

  console.log("Externals:", externals);

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(distDir, "index.cjs"),
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    // external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
