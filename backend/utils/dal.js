/**
 * DAL — Data Access Layer
 * All routes use these functions. They work with MongoDB when connected,
 * and fall back to in-memory arrays when not.
 */
const { isUsingMongo, getStore } = require("../config/db");
const UserModel        = require("../models/User");
const TransactionModel = require("../models/Transaction");
const GoalModel        = require("../models/Goal");
const NoteModel        = require("../models/Note");
const { v4: uuid } = require("crypto");

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ─── USERS ────────────────────────────────────────────────────────────────────

async function findUserByEmail(email) {
  if (isUsingMongo()) return UserModel.findOne({ email: email.toLowerCase() });
  return getStore().users.find(u => u.email === email.toLowerCase()) || null;
}

async function findUserById(id) {
  if (isUsingMongo()) return UserModel.findById(id);
  return getStore().users.find(u => u.id === id) || null;
}

async function createUser(data) {
  if (isUsingMongo()) { const u = new UserModel(data); return u.save(); }
  const user = { id: newId(), ...data, createdAt: new Date().toISOString() };
  getStore().users.push(user);
  return user;
}

async function updateUser(id, data) {
  if (isUsingMongo()) return UserModel.findByIdAndUpdate(id, data, { new: true });
  const store = getStore();
  const idx = store.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  store.users[idx] = { ...store.users[idx], ...data };
  return store.users[idx];
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

async function getTransactions(userId, filters = {}) {
  if (isUsingMongo()) {
    const query = { userId };
    if (filters.startDate) query.date = { $gte: filters.startDate };
    if (filters.endDate)   query.date = { ...query.date, $lte: filters.endDate };
    if (filters.category)  query.category = filters.category;
    if (filters.type)      query.type = filters.type;
    return TransactionModel.find(query).sort({ date: -1 });
  }
  let list = getStore().transactions.filter(t => t.userId === userId);
  if (filters.startDate) list = list.filter(t => t.date >= filters.startDate);
  if (filters.endDate)   list = list.filter(t => t.date <= filters.endDate);
  if (filters.category)  list = list.filter(t => t.category === filters.category);
  if (filters.type)      list = list.filter(t => t.type === filters.type);
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

async function createTransaction(data) {
  if (isUsingMongo()) { const t = new TransactionModel(data); return t.save(); }
  const txn = { id: newId(), _id: newId(), ...data, createdAt: new Date().toISOString() };
  getStore().transactions.push(txn);
  return txn;
}

async function createManyTransactions(dataArray) {
  if (isUsingMongo()) return TransactionModel.insertMany(dataArray);
  const txns = dataArray.map(d => ({ id: newId(), _id: newId(), ...d, createdAt: new Date().toISOString() }));
  getStore().transactions.push(...txns);
  return txns;
}

async function updateTransaction(id, userId, data) {
  if (isUsingMongo()) return TransactionModel.findOneAndUpdate({ _id: id, userId }, data, { new: true });
  const store = getStore();
  const idx = store.transactions.findIndex(t => (t.id === id || t._id === id) && t.userId === userId);
  if (idx === -1) return null;
  store.transactions[idx] = { ...store.transactions[idx], ...data };
  return store.transactions[idx];
}

async function deleteTransaction(id, userId) {
  if (isUsingMongo()) return TransactionModel.findOneAndDelete({ _id: id, userId });
  const store = getStore();
  const idx = store.transactions.findIndex(t => (t.id === id || t._id === id) && t.userId === userId);
  if (idx === -1) return null;
  const removed = store.transactions[idx];
  store.transactions.splice(idx, 1);
  return removed;
}

async function deleteTransactionsByImport(userId, importId) {
  if (isUsingMongo()) {
    const res = await TransactionModel.deleteMany({ userId, importId });
    return res.deletedCount;
  }
  const store = getStore();
  const before = store.transactions.length;
  store.transactions = store.transactions.filter(t => !(t.userId === userId && t.importId === importId));
  return before - store.transactions.length;
}

// Uploaded rows that predate per-file batch tracking (no importId).
// Older app versions stored the file extension in `source` ("csv", "xlsx"),
// so legacy means: anything not manually entered and without a batch id.
async function deleteLegacyUploads(userId) {
  if (isUsingMongo()) {
    const res = await TransactionModel.deleteMany({
      userId, source: { $ne: "manual" },
      $or: [{ importId: "" }, { importId: null }, { importId: { $exists: false } }],
    });
    return res.deletedCount;
  }
  const store = getStore();
  const before = store.transactions.length;
  store.transactions = store.transactions.filter(t => !(t.userId === userId && t.source !== "manual" && !t.importId));
  return before - store.transactions.length;
}

// ─── GOALS ────────────────────────────────────────────────────────────────────

async function getGoals(userId) {
  if (isUsingMongo()) return GoalModel.find({ userId }).sort({ createdAt: -1 });
  return getStore().goals.filter(g => g.userId === userId);
}

async function createGoal(data) {
  if (isUsingMongo()) { const g = new GoalModel(data); return g.save(); }
  const goal = { id: newId(), _id: newId(), ...data, createdAt: new Date().toISOString() };
  getStore().goals.push(goal);
  return goal;
}

async function updateGoal(id, userId, data) {
  if (isUsingMongo()) return GoalModel.findOneAndUpdate({ _id: id, userId }, data, { new: true });
  const store = getStore();
  const idx = store.goals.findIndex(g => (g.id === id || g._id === id) && g.userId === userId);
  if (idx === -1) return null;
  store.goals[idx] = { ...store.goals[idx], ...data };
  return store.goals[idx];
}

async function deleteGoal(id, userId) {
  if (isUsingMongo()) return GoalModel.findOneAndDelete({ _id: id, userId });
  const store = getStore();
  const idx = store.goals.findIndex(g => (g.id === id || g._id === id) && g.userId === userId);
  if (idx === -1) return null;
  const removed = store.goals[idx];
  store.goals.splice(idx, 1);
  return removed;
}

// ─── NOTES ────────────────────────────────────────────────────────────────────

async function getNotes(userId) {
  if (isUsingMongo()) return NoteModel.find({ userId }).sort({ createdAt: -1 });
  return getStore().notes.filter(n => n.userId === userId);
}

async function createNote(data) {
  if (isUsingMongo()) { const n = new NoteModel(data); return n.save(); }
  const note = { id: newId(), _id: newId(), ...data, createdAt: new Date().toISOString() };
  getStore().notes.push(note);
  return note;
}

async function updateNote(id, userId, data) {
  if (isUsingMongo()) return NoteModel.findOneAndUpdate({ _id: id, userId }, data, { new: true });
  const store = getStore();
  const idx = store.notes.findIndex(n => (n.id === id || n._id === id) && n.userId === userId);
  if (idx === -1) return null;
  store.notes[idx] = { ...store.notes[idx], ...data };
  return store.notes[idx];
}

async function deleteNote(id, userId) {
  if (isUsingMongo()) return NoteModel.findOneAndDelete({ _id: id, userId });
  const store = getStore();
  const idx = store.notes.findIndex(n => (n.id === id || n._id === id) && n.userId === userId);
  if (idx === -1) return null;
  const removed = store.notes[idx];
  store.notes.splice(idx, 1);
  return removed;
}

module.exports = {
  findUserByEmail, findUserById, createUser, updateUser,
  getTransactions, createTransaction, createManyTransactions, updateTransaction, deleteTransaction, deleteTransactionsByImport, deleteLegacyUploads,
  getGoals, createGoal, updateGoal, deleteGoal,
  getNotes, createNote, updateNote, deleteNote,
};
