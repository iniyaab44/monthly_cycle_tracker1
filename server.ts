import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev";
const PORT = 3000;

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());

// API Routes
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, username } = req.body;
  
  // Check if user exists
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
});

app.post("/api/auth/login", async (req, res) => {
  const { identifier, password } = req.body;
  
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
});

app.get("/api/health", async (req, res) => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ status: "ok", database: "connected" });
  } catch (e) {
    res.status(500).json({ status: "error", database: "disconnected" });
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

app.get("/api/logs", authenticateToken, async (req: any, res) => {
  const { data: logs, error } = await supabase
    .from('logs')
    .select('*')
    .eq('userId', req.user.id)
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(logs);
});

app.post("/api/logs", authenticateToken, async (req: any, res) => {
  const { date, status, time, description } = req.body;
  
  const { data, error } = await supabase
    .from('logs')
    .insert([{ userId: req.user.id, date, status, time, description }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.put("/api/logs/:id", authenticateToken, async (req: any, res) => {
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

app.delete("/api/logs/:id", authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from('logs')
    .delete()
    .eq('id', req.params.id)
    .eq('userId', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.sendStatus(204);
});

app.put("/api/user/profile", authenticateToken, async (req: any, res) => {
  const { email, password } = req.body;
  const updates: any = {};
  
  if (email) {
    // Check if email is already taken by another user
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

  if (password) {
    updates.password = await bcrypt.hash(password, 10);
  }

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
  console.log(`API 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

export default app;
