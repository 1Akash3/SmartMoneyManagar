const mongoose = require("mongoose");

// In-memory fallback (used only if MONGODB_URI missing or connection fails)
const memStore = { users: [], transactions: [], goals: [], notes: [] };
let usingMongo = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri || !uri.trim()) {
    console.log("⚡ No MONGODB_URI — running in IN-MEMORY mode (data resets on restart).");
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    usingMongo = true;
    console.log("✅ MongoDB Atlas connected.");
    return true;
  } catch (err) {
    console.warn("⚠️  MongoDB connection failed — falling back to in-memory mode.");
    console.warn("   Reason:", err.message);
    return false;
  }
}

const isUsingMongo = () => usingMongo;
const getStore     = () => memStore;

module.exports = { connectDB, isUsingMongo, getStore };
