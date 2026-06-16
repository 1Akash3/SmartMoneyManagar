require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
const { connectDB } = require("./config/db");

const app = express();

// Behind Render's load balancer (and the Vercel /api proxy), so trust the
// first proxy hop. Lets express-rate-limit and req.ip see the real client IP
// instead of the proxy, and silences its X-Forwarded-For ValidationError.
app.set("trust proxy", 1);

// Security
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: "Too many requests. Please wait 15 minutes." }
});

// Routes
app.use("/api/auth",         authLimiter, require("./routes/auth"));
app.use("/api/transactions",              require("./routes/transactions"));
app.use("/api/goals",                     require("./routes/goals"));
app.use("/api/notes",                     require("./routes/notes"));
app.use("/api/email",                     require("./routes/email"));
app.use("/api/ai",                        require("./routes/ai"));

app.get("/", (req, res) => res.json({ status: "SpendSmart v4 API", time: new Date() }));

// Global error handler — no white screens
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong. Please try again." });
});

const PORT = process.env.PORT || 5000;
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 SpendSmart v4 running → http://localhost:${PORT}`);
    console.log(`   DB: ${process.env.MONGODB_URI ? "MongoDB Atlas" : "In-Memory (no MONGODB_URI set)"}\n`);
  });
}
start();
