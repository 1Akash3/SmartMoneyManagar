import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import {
  Card, Btn, Modal, Input, Select, Textarea,
  EmptyState, PageSpinner, Icon, MerchantAvatar, fmt, CAT_COLORS, CATEGORIES
} from "../components/shared/UI";
import * as api from "../services/api";

const TYPES = [
  { value: "expense",    label: "Expense" },
  { value: "income",     label: "Income" },
  { value: "saving",     label: "Saving" },
  { value: "investment", label: "Investment" },
  { value: "transfer",   label: "Transfer" },
];
const PAY_METHODS = [
  { value: "",           label: "Select method" },
  { value: "UPI",        label: "UPI" },
  { value: "Card",       label: "Credit/Debit Card" },
  { value: "Cash",       label: "Cash" },
  { value: "NetBanking", label: "Net Banking" },
  { value: "Wallet",     label: "Wallet" },
];
const emptyForm = { date: new Date().toISOString().slice(0, 10), merchant: "", amount: "", category: "Food", type: "expense", paymentMethod: "", city: "", notes: "", isRecurring: false };

const TYPE_COLOR = {
  expense: "var(--danger)", income: "var(--success)", saving: "var(--info)",
  investment: "#0891b2", transfer: "var(--warning)",
};

export default function TransactionsPage({ params }) {
  const { transactions, addTransaction, editTransaction, removeTransaction, applyAnalytics, fetchTransactions, loading } = useApp();
  const [view, setView] = useState("transactions"); // transactions | imports
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState(params?.search || "");
  const [filterCat, setFilterCat] = useState(params?.category || "");
  const [filterType, setFilterType] = useState(params?.type || "");
  const [imports, setImports] = useState(null);
  const [deleteImportConfirm, setDeleteImportConfirm] = useState(null);
  const [deletingImport, setDeletingImport] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };

  useEffect(() => {
    if (params?.type) setFilterType(params.type);
    if (params?.search) setSearch(params.search);
    if (params?.category) setFilterCat(params.category);
    if (params) { setView("transactions"); setPage(1); }
  }, [params]);

  async function loadImports() {
    try {
      const { data } = await api.getImports();
      setImports(data);
    } catch { toast.error("Failed to load imports."); }
  }
  useEffect(() => { if (view === "imports") loadImports(); }, [view]);

  async function handleDeleteImport(batch) {
    setDeletingImport(true);
    try {
      const { data } = await api.deleteImport(batch.importId);
      toast.success(`Deleted ${data.deleted} transactions from "${batch.file}".`);
      applyAnalytics(data.analytics);
      fetchTransactions();
      setDeleteImportConfirm(null);
      loadImports();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete import.");
    } finally { setDeletingImport(false); }
  }

  function validate() {
    const e = {};
    if (!form.date) e.date = "Date is required.";
    else if (new Date(form.date) > new Date()) e.date = "Date cannot be in the future.";
    if (!form.merchant.trim()) e.merchant = "Merchant is required.";
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) e.amount = "Enter a valid positive amount.";
    if (parseFloat(form.amount) > 10000000) e.amount = "Amount seems too large. Please verify.";
    if (!form.category) e.category = "Category is required.";
    setErrors(e);
    return !Object.keys(e).length;
  }

  function openAdd() { setForm(emptyForm); setEditItem(null); setErrors({}); setModal(true); }
  function openEdit(t) {
    setForm({ date: t.date, merchant: t.merchant, amount: String(t.amount), category: t.category, type: t.type || "expense", paymentMethod: t.paymentMethod || "", city: t.city || "", notes: t.notes || "", isRecurring: !!t.isRecurring });
    setEditItem(t); setErrors({}); setModal(true);
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editItem) {
        await editTransaction(editItem._id || editItem.id, { ...form, amount: parseFloat(form.amount) });
        toast.success("Transaction updated.");
      } else {
        await addTransaction({ ...form, amount: parseFloat(form.amount) });
        toast.success("Transaction added.");
      }
      setModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save.");
    } finally { setSaving(false); }
  }

  async function handleDelete(t) {
    setDeleting(t._id || t.id);
    try {
      await removeTransaction(t._id || t.id);
      toast.success("Transaction deleted.");
      setDeleteConfirm(null);
    } catch { toast.error("Failed to delete."); }
    finally { setDeleting(null); }
  }

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (search) list = list.filter(t => `${t.merchant} ${t.category} ${t.notes || ""}`.toLowerCase().includes(search.toLowerCase()));
    if (filterCat) list = list.filter(t => t.category === filterCat);
    if (filterType) list = list.filter(t => (t.type || "expense") === filterType);
    if (dateFrom) list = list.filter(t => t.date >= dateFrom);
    if (dateTo) list = list.filter(t => t.date <= dateTo);
    switch (sortBy) {
      case "date-asc":    list.sort((a, b) => a.date.localeCompare(b.date)); break;
      case "amount-desc": list.sort((a, b) => b.amount - a.amount); break;
      case "amount-asc":  list.sort((a, b) => a.amount - b.amount); break;
      default:            list.sort((a, b) => b.date.localeCompare(a.date)); break;
    }
    return list;
  }, [transactions, search, filterCat, filterType, dateFrom, dateTo, sortBy]);

  const totalPages = Math.max(Math.ceil(filtered.length / PER_PAGE), 1);
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const summary = useMemo(() => ({
    totalExpense: filtered.filter(t => t.type === "expense" || !t.type).reduce((s, t) => s + t.amount, 0),
    totalIncome: filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
    count: filtered.length,
  }), [filtered]);

  if (loading && !transactions.length) return <PageSpinner />;

  const selectCls = "bg-surface2 border border-stroke rounded-xl px-3 py-2 text-sm text-ink2 cursor-pointer";

  return (
    <div className="space-y-4">
      {/* View switch: live transactions vs imported datasets */}
      <div className="flex gap-1 bg-surface border border-stroke rounded-2xl p-1 max-w-xs">
        {[{ id: "transactions", label: "Transactions" }, { id: "imports", label: "Imported Datasets" }].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors border-0 ${view === t.id ? "bg-primary text-white [.dark_&]:text-[#0b0d13]" : "bg-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {view === "imports" ? (
        <>
          <Card className="p-5">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink tracking-tight">Imported Datasets</h3>
                <p className="text-xs text-muted mt-0.5">Every statement you've fed into the system. Deleting one removes all its transactions — analytics update instantly.</p>
              </div>
            </div>
            {imports === null ? (
              <div className="py-8 flex justify-center"><span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : imports.imports.length === 0 ? (
              <EmptyState icon="upload" title="No datasets imported yet"
                sub="Statements you import from the dashboard will appear here, grouped by file, so you can remove a wrong upload in one click." />
            ) : (
              <div className="space-y-2">
                {imports.imports.map(b => (
                  <div key={b.importId} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-stroke bg-surface2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-primary flex-shrink-0" style={{ background: "var(--primary-soft)" }}>
                        <Icon name="fileText" size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{b.file}</p>
                        <p className="text-xs text-muted tnum">{b.count} transactions · {b.firstDate} to {b.lastDate}</p>
                        {b.legacy && <p className="text-[11px] text-warning mt-0.5">Grouped together — these rows were imported before per-file tracking was added.</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-danger font-semibold tnum">{fmt(b.totalExpense)} spent</p>
                        {b.totalIncome > 0 && <p className="text-xs text-success font-semibold tnum">{fmt(b.totalIncome)} received</p>}
                      </div>
                      <Btn size="sm" variant="danger" icon="trash" onClick={() => setDeleteImportConfirm(b)}>Delete</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {imports !== null && imports.manualCount > 0 && (
              <p className="text-xs text-muted mt-4">
                Plus {imports.manualCount} manually added transaction{imports.manualCount > 1 ? "s" : ""} — manage those individually in the Transactions tab.
              </p>
            )}
          </Card>
        </>
      ) : (
      <>
      {transactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Expenses", value: fmt(summary.totalExpense), color: "var(--danger)" },
            { label: "Total Income",   value: fmt(summary.totalIncome),  color: "var(--success)" },
            { label: "Transactions",   value: summary.count,             color: "var(--primary)" },
          ].map(s => (
            <Card key={s.label} className="p-4 text-center">
              <p className="text-lg font-bold tnum tracking-tight" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[180px] relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={15} /></span>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search merchant, category, notes"
                className="w-full pl-9 pr-3 py-2.5 bg-surface2 border border-stroke rounded-xl text-sm text-ink placeholder-faint"
                style={{ outline: "none" }} />
            </div>
            <Btn onClick={openAdd} icon="plus">Add Transaction</Btn>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }} className={selectCls} style={{ outline: "none" }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className={selectCls} style={{ outline: "none" }}>
              <option value="">All Types</option>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} title="From date" className={selectCls} style={{ outline: "none" }} />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} title="To date" className={selectCls} style={{ outline: "none" }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={selectCls} style={{ outline: "none" }}>
              <option value="date-desc">Latest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
            </select>
            {(filterCat || filterType || dateFrom || dateTo || search) && (
              <Btn variant="ghost" size="sm" icon="x" onClick={() => { setSearch(""); setFilterCat(""); setFilterType(""); setDateFrom(""); setDateTo(""); setPage(1); }}>Clear</Btn>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="creditCard" title="No transactions found"
            sub={transactions.length ? "Try adjusting your filters." : "Import a statement or add transactions manually."}
            action={transactions.length === 0 ? <Btn onClick={openAdd} icon="plus">Add Transaction</Btn> : null} />
        ) : (
          <>
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 border-b border-stroke">
              {[["Date", "col-span-2"], ["Merchant", "col-span-3"], ["Category", "col-span-2"], ["Type", "col-span-2"], ["Amount", "col-span-2 text-right"], ["", "col-span-1"]].map(([h, cls], i) => (
                <span key={i} className={`text-[10px] font-semibold text-muted uppercase tracking-widest ${cls}`}>{h}</span>
              ))}
            </div>

            <AnimatePresence initial={false}>
              {paginated.map(t => {
                const id = t._id || t.id;
                const type = t.type || "expense";
                const isInc = type === "income" || type === "saving";
                return (
                  <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-stroke last:border-0 items-center hover:bg-surface2 transition-colors group">
                    <span className="col-span-4 md:col-span-2 text-xs text-muted font-medium tnum">{t.date}</span>
                    <div className="col-span-6 md:col-span-3 flex items-center gap-2.5 min-w-0">
                      <MerchantAvatar merchant={t.merchant} size={30} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{t.merchant}</p>
                        <div className="flex gap-1.5 mt-0.5">
                          {t.isRecurring && <span className="text-[9px] font-bold uppercase tracking-wide text-primary">Recurring</span>}
                          {t.source === "manual" && <span className="text-[9px] font-bold uppercase tracking-wide text-faint">Manual</span>}
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:flex col-span-2 items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: CAT_COLORS[t.category] || "#9ca3af" }} />
                      <span className="text-xs text-ink2 truncate">{t.category}</span>
                    </div>
                    <div className="hidden md:block col-span-2">
                      <span className="text-[11px] px-2 py-1 rounded-md font-semibold capitalize"
                        style={{ color: TYPE_COLOR[type], background: "var(--surface-2)" }}>{type}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-sm font-bold tnum" style={{ color: isInc ? "var(--success)" : "var(--ink)" }}>
                        {isInc ? "+" : ""}{fmt(t.amount)}
                      </p>
                      {t.paymentMethod && <p className="text-[10px] text-muted mt-0.5">{t.paymentMethod}</p>}
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(t)} title="Edit"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-primary bg-surface border border-stroke transition-colors">
                        <Icon name="edit" size={12} />
                      </button>
                      <button onClick={() => setDeleteConfirm(t)} title="Delete"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-danger bg-surface border border-stroke transition-colors">
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-stroke">
                <p className="text-xs text-muted tnum">{(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}</p>
                <div className="flex gap-1 items-center">
                  <Btn size="xs" variant="secondary" icon="chevronLeft" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} />
                  <span className="text-xs text-ink2 px-2 tnum">{safePage} / {totalPages}</span>
                  <Btn size="xs" variant="secondary" icon="chevronRight" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} />
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      </>
      )}

      {/* Delete Import Confirm */}
      <Modal open={!!deleteImportConfirm} onClose={() => setDeleteImportConfirm(null)} title="Delete this dataset?" size="sm">
        {deleteImportConfirm && (
          <div>
            <p className="text-sm text-ink2 mb-4 leading-relaxed">
              Delete <strong className="text-ink">{deleteImportConfirm.file}</strong> and all its{" "}
              <strong className="text-ink tnum">{deleteImportConfirm.count} transactions</strong> ({deleteImportConfirm.firstDate} to {deleteImportConfirm.lastDate})?
              Your analytics will recalculate immediately. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Btn variant="danger" onClick={() => handleDeleteImport(deleteImportConfirm)} disabled={deletingImport} className="flex-1" icon="trash">
                {deletingImport ? "Deleting…" : `Delete ${deleteImportConfirm.count} transactions`}
              </Btn>
              <Btn variant="secondary" onClick={() => setDeleteImportConfirm(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? "Edit Transaction" : "Add Transaction"}
        subtitle={editItem ? "Update the details below" : "Record income, expense, saving, or investment"} size="lg">
        <div className="grid grid-cols-2 gap-x-3">
          <Input label="Date" type="date" value={form.date} onChange={set("date")} error={errors.date} required />
          <Input label="Merchant / Description" value={form.merchant} onChange={set("merchant")} placeholder="e.g. Zomato" error={errors.merchant} required />
          <Input label="Amount" type="number" value={form.amount} onChange={set("amount")} placeholder="0.00" error={errors.amount} required />
          <Select label="Category" value={form.category} onChange={set("category")} options={CATEGORIES.map(c => ({ value: c, label: c }))} error={errors.category} required />
          <Select label="Type" value={form.type} onChange={set("type")} options={TYPES} />
          <Select label="Payment Method" value={form.paymentMethod} onChange={set("paymentMethod")} options={PAY_METHODS} />
          <Input label="City (optional)" value={form.city} onChange={set("city")} placeholder="e.g. Pune" />
          <div className="flex items-end pb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} className="w-4 h-4 accent-[var(--primary)] rounded" />
              <span className="text-xs text-ink2">Recurring transaction</span>
            </label>
          </div>
        </div>
        <Textarea label="Notes (optional)" value={form.notes} onChange={set("notes")} placeholder="Any additional details" rows={2} />
        <div className="flex gap-3 mt-1">
          <Btn onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving…" : editItem ? "Update Transaction" : "Add Transaction"}
          </Btn>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Transaction?" size="sm">
        {deleteConfirm && (
          <div>
            <p className="text-sm text-ink2 mb-4 leading-relaxed">
              Delete <strong className="text-ink">{deleteConfirm.merchant}</strong> ({fmt(deleteConfirm.amount)} on {deleteConfirm.date})?
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Btn variant="danger" onClick={() => handleDelete(deleteConfirm)} disabled={!!deleting} className="flex-1" icon="trash">
                {deleting ? "Deleting…" : "Delete"}
              </Btn>
              <Btn variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
