"use client";

import { useMemo, useState, useTransition } from "react";
import { addExpense, deleteExpense } from "./actions";
import { HBarChart } from "./charts";

export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  incurred_on: string;
  is_recurring: boolean;
  recurring_interval: "monthly" | "yearly" | null;
  notes: string | null;
};

const CATEGORIES = ["Domain", "Hosting", "Database", "Email", "Design & Tools", "Marketing", "Other"];
const CURRENCIES = ["INR", "USD"];
const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$" };

function money(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ExpensesSection({ initialExpenses }: { initialExpenses: Expense[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [incurredOn, setIncurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<"monthly" | "yearly">("yearly");

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of expenses) totals[e.currency] = (totals[e.currency] ?? 0) + Number(e.amount);
    return totals;
  }, [expenses]);

  // What the current recurring commitments cost per year, per currency --
  // the number that actually matters for "can I afford to keep this running".
  const annualRecurringByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of expenses) {
      if (!e.is_recurring) continue;
      const yearly = e.recurring_interval === "monthly" ? Number(e.amount) * 12 : Number(e.amount);
      totals[e.currency] = (totals[e.currency] ?? 0) + yearly;
    }
    return totals;
  }, [expenses]);

  const byCategoryByCurrency = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};
    for (const e of expenses) {
      grouped[e.currency] ??= {};
      grouped[e.currency][e.category] = (grouped[e.currency][e.category] ?? 0) + Number(e.amount);
    }
    return grouped;
  }, [expenses]);

  const currencies = Object.keys(totalsByCurrency);

  function resetForm() {
    setDescription("");
    setCategory(CATEGORIES[0]);
    setAmount("");
    setCurrency("INR");
    setIncurredOn(new Date().toISOString().slice(0, 10));
    setIsRecurring(false);
    setRecurringInterval("yearly");
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!description.trim() || !amountNum || amountNum <= 0) {
      setError("Enter a description and a positive amount.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addExpense({
        description: description.trim(),
        category,
        amount: amountNum,
        currency,
        incurred_on: incurredOn,
        is_recurring: isRecurring,
        recurring_interval: isRecurring ? recurringInterval : null,
        notes: null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      // Optimistic local id -- the real row reappears with its true id on
      // next navigation; this just keeps the list live without a refetch.
      setExpenses((prev) => [
        {
          id: `pending-${Date.now()}`,
          description: description.trim(),
          category,
          amount: amountNum,
          currency,
          incurred_on: incurredOn,
          is_recurring: isRecurring,
          recurring_interval: isRecurring ? recurringInterval : null,
          notes: null,
        },
        ...prev,
      ]);
      resetForm();
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteExpense(id);
      if (result.error) {
        setError(result.error);
      } else {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      }
      setDeletingId(null);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {currencies.length > 0 ? (
            currencies.map((c) => (
              <div key={c} className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2.5 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total spent ({c})</p>
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{money(totalsByCurrency[c], c)}</p>
                {annualRecurringByCurrency[c] > 0 && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {money(annualRecurringByCurrency[c], c)}/yr recurring
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Nothing logged yet.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          {showForm ? "Cancel" : "+ Add expense"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 grid gap-3 rounded-xl border border-slate-200/70 bg-white/60 p-4 dark:border-slate-800/70 dark:bg-slate-900/40 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 sm:col-span-2">
            Description
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. campusbin.in renewal"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select-chevron mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Date
            <input
              type="date"
              value={incurredOn}
              onChange={(e) => setIncurredOn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Currency
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="select-chevron mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-3 sm:col-span-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-700"
              />
              Recurring
            </label>
            {isRecurring && (
              <select
                value={recurringInterval}
                onChange={(e) => setRecurringInterval(e.target.value as "monthly" | "yearly")}
                className="select-chevron rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="ml-auto rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save expense"}
            </button>
          </div>
        </form>
      )}

      {currencies.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {currencies.map((c) => (
            <div key={c}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                By category ({c})
              </p>
              <HBarChart
                data={Object.entries(byCategoryByCurrency[c]).map(([label, value]) => ({ label, value }))}
              />
            </div>
          ))}
        </div>
      )}

      {expenses.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800/70 dark:text-slate-500">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-500 dark:text-slate-400">
                    {new Date(`${e.incurred_on}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-2 pr-3 text-slate-800 dark:text-slate-200">{e.description}</td>
                  <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{e.category}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {money(Number(e.amount), e.currency)}
                  </td>
                  <td className="py-2 pr-3">
                    {e.is_recurring && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {e.recurring_interval}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      disabled={isPending && deletingId === e.id}
                      onClick={() => handleDelete(e.id)}
                      className="text-xs font-medium text-slate-400 hover:text-rose-600 disabled:opacity-50 dark:text-slate-500 dark:hover:text-rose-400"
                    >
                      {isPending && deletingId === e.id ? "…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
