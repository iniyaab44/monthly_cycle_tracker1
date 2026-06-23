import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

// Load environment variables in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev";
const PORT = Number(process.env.PORT) || 3000;

// Supabase Setup — try all variable names Vercel integration may inject
const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).trim().replace(/\/$/, "");

const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim();

// Log startup env state (prefix only — safe for logs)
console.log("[STARTUP] SUPABASE_URL detected:", supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "MISSING");
console.log("[STARTUP] SUPABASE_KEY detected:", supabaseKey ? supabaseKey.substring(0, 10) + "..." : "MISSING");
console.log("[STARTUP] JWT_SECRET detected:", process.env.JWT_SECRET ? "YES" : "MISSING");
console.log("[STARTUP] NODE_ENV:", process.env.NODE_ENV);
console.log("[STARTUP] VERCEL:", process.env.VERCEL || "not set");

let supabase: any = null;
let supabaseInitError = "";

if (!supabaseUrl) {
  supabaseInitError = "SUPABASE_URL is missing or empty. Check Vercel Environment Variables.";
  console.error("[STARTUP] CRITICAL:", supabaseInitError);
} else if (!supabaseKey) {
  supabaseInitError = "SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY are both missing. Check Vercel Environment Variables.";
  console.error("[STARTUP] CRITICAL:", supabaseInitError);
} else if (!supabaseUrl.startsWith('http')) {
  supabaseInitError = `SUPABASE_URL must start with https://. Got: "${supabaseUrl.substring(0, 15)}..."`;
  console.error("[STARTUP] CRITICAL:", supabaseInitError);
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[STARTUP] Supabase client initialized successfully.");
  } catch (err: any) {
    supabaseInitError = `createClient() threw: ${err.message}`;
    console.error("[STARTUP] CRITICAL:", supabaseInitError);
  }
}

const app = express();

// Standard Middleware
app.use(cors());
app.use(express.json());

// --- API Routes ---

// Health Check — shows exactly which env vars were found and why init failed
app.get("/api/health", async (req, res) => {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    supabaseInitialized: !!supabase,
    supabaseInitError: supabaseInitError || null,
    env: {
      // SUPABASE_URL variants
      SUPABASE_URL:               process.env.SUPABASE_URL               ? process.env.SUPABASE_URL.substring(0, 30) + "..." : "MISSING",
      NEXT_PUBLIC_SUPABASE_URL:   process.env.NEXT_PUBLIC_SUPABASE_URL   ? "present" : "MISSING",
      // KEY variants
      SUPABASE_SERVICE_ROLE_KEY:  process.env.SUPABASE_SERVICE_ROLE_KEY  ? "present" : "MISSING",
      SUPABASE_SECRET_KEY:        process.env.SUPABASE_SECRET_KEY        ? "present" : "MISSING",
      SUPABASE_ANON_KEY:          process.env.SUPABASE_ANON_KEY          ? "present" : "MISSING",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "present" : "MISSING",
      // App vars
      JWT_SECRET:   process.env.JWT_SECRET   ? "present" : "MISSING",
      NODE_ENV:     process.env.NODE_ENV,
      VERCEL:       process.env.VERCEL || "not set",
    }
  };

  try {
    if (!supabase) {
      return res.json({
        status: "error",
        database: "not_initialized",
        message: supabaseInitError || "Supabase client not initialized — check debug info",
        debug: debugInfo
      });
    }

    const { error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      return res.json({
        status: "warn",
        database: "error",
        message: error.message,
        code: error.code,
        debug: debugInfo
      });
    }

    res.json({ status: "ok", database: "connected", debug: debugInfo });
  } catch (e: any) {
    res.status(500).json({ status: "error", database: "exception", message: e.message, debug: debugInfo });
  }
});

// Middleware to ensure Supabase is initialized
const ensureSupabase = (req: any, res: any, next: any) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Server configuration error: Supabase client not initialized.",
      initError: supabaseInitError || "Unknown reason",
      fix: "Visit /api/health for full diagnostics. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel → Project Settings → Environment Variables, then redeploy."
    });
  }
  next();
};

// Auth Routes
app.post("/api/auth/register", ensureSupabase, async (req, res) => {
  const { email, password, name, username } = req.body;
  
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "Email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { error } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, name, username }]);

    if (error) return res.status(500).json({ error: error.message });
    
    res.status(201).json({ message: "User registered" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", ensureSupabase, async (req, res) => {
  const { identifier, password } = req.body;
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .single();

    if (error || !user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Protected Routes
app.get("/api/logs", ensureSupabase, authenticateToken, async (req: any, res) => {
  const { data: logs, error } = await supabase
    .from('logs')
    .select('*')
    .eq('userId', req.user.id)
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(logs);
});

app.post("/api/logs", ensureSupabase, authenticateToken, async (req: any, res) => {
  const { date, status, time, description } = req.body;
  
  const { data, error } = await supabase
    .from('logs')
    .insert([{ userId: req.user.id, date, status, time, description }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.put("/api/logs/:id", ensureSupabase, authenticateToken, async (req: any, res) => {
  const { date, status, time, description } = req.body;
  
  const { data, error } = await supabase
    .from('logs')
    .update({ date, status, time, description })
    .eq('id', req.params.id)
    .eq('userId', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/logs/:id", ensureSupabase, authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from('logs')
    .delete()
    .eq('id', req.params.id)
    .eq('userId', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.sendStatus(204);
});

app.put("/api/user/profile", ensureSupabase, authenticateToken, async (req: any, res) => {
  const { email, password, name, username } = req.body;
  const updates: any = {};
  
  if (email) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', req.user.id)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }
    updates.email = email;
  }

  if (username) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', req.user.id)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "Username already in use" });
    }
    updates.username = username;
  }

  if (name) updates.name = name;
  if (password) updates.password = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: { id: data.id, email: data.email, name: data.name, username: data.username } });
});

// API 404 Handler
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// --- Server Startup (Local Only) ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Vite failed to load:", err);
    }
  } else {
    // Static serving for local production testing
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
}

export default app;
