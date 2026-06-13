// Shared types + mock seed data for the KhataOS MVP.
// State persists in localStorage; this module exposes hooks to read & mutate.

import { useSyncExternalStore } from "react";

export type Txn = {
  id: string;
  date: string; // ISO
  kind: "credit" | "repayment" | "order";
  amount: number;
  note?: string;
  items?: { name: string; qty: number; price: number }[];
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  trustScore: number; // 0-100
  creditLimit: number;
  outstanding: number;
  reliability: number; // 0-100
  lastActivity: string;
  txns: Txn[];
  riskTag?: "low" | "medium" | "high";
  dueDate?: string;
};

export type Order = {
  id: string;
  customerId: string;
  amount: number;
  status: "pending" | "packed" | "ready" | "delivered";
  onCredit: boolean;
  items: { name: string; qty: number; price: number }[];
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  qty: number;
  cost: number;
  mrp: number;
  expiry?: string;
};

export type KhataState = {
  me: { id: string; name: string }; // customer "me"
  customers: Customer[];
  orders: Order[];
  inventory: InventoryItem[];
  shop: { name: string; owner: string };
  brainInstalled: boolean;
};

const KEY = "khataos:v1";

const today = () => new Date().toISOString();
const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString();

function seed(): KhataState {
  const me: Customer = {
    id: "c_me",
    name: "Ramesh Kumar",
    phone: "+91 63646 37752",
    trustScore: 82,
    creditLimit: 5000,
    outstanding: 1850,
    reliability: 91,
    lastActivity: today(),
    riskTag: "low",
    dueDate: daysFromNow(4),
    txns: [
      { id: "t1", date: daysFromNow(-2), kind: "credit", amount: 450, note: "Atta, dal, oil" },
      { id: "t2", date: daysFromNow(-5), kind: "repayment", amount: 1200 },
      { id: "t3", date: daysFromNow(-9), kind: "credit", amount: 800, note: "Weekly groceries" },
      { id: "t4", date: daysFromNow(-14), kind: "credit", amount: 600, note: "Milk, bread" },
    ],
  };
  const others: Customer[] = [
    {
      id: "c_p1", name: "Priya Sharma", phone: "+91 90000 11111",
      trustScore: 94, creditLimit: 8000, outstanding: 0, reliability: 98,
      lastActivity: daysFromNow(-1), riskTag: "low",
      txns: [{ id: "p1", date: daysFromNow(-1), kind: "repayment", amount: 2400 }],
    },
    {
      id: "c_s1", name: "Suresh Patel", phone: "+91 90000 22222",
      trustScore: 71, creditLimit: 4000, outstanding: 2200, reliability: 78,
      lastActivity: daysFromNow(-3), riskTag: "medium", dueDate: daysFromNow(2),
      txns: [{ id: "s1", date: daysFromNow(-3), kind: "credit", amount: 1100, note: "Snacks, soap" }],
    },
    {
      id: "c_a1", name: "Anita Devi", phone: "+91 90000 33333",
      trustScore: 58, creditLimit: 3000, outstanding: 2850, reliability: 62,
      lastActivity: daysFromNow(-12), riskTag: "high", dueDate: daysFromNow(-3),
      txns: [{ id: "a1", date: daysFromNow(-12), kind: "credit", amount: 1850, note: "Rice, dal" }],
    },
    {
      id: "c_m1", name: "Mohan Singh", phone: "+91 90000 44444",
      trustScore: 88, creditLimit: 10000, outstanding: 3400, reliability: 92,
      lastActivity: today(), riskTag: "low", dueDate: daysFromNow(7),
      txns: [{ id: "m1", date: today(), kind: "credit", amount: 3400, note: "Monthly stock" }],
    },
  ];
  return {
    me: { id: "c_me", name: me.name },
    customers: [me, ...others],
    orders: [
      { id: "o1", customerId: "c_p1", amount: 450, status: "pending", onCredit: false,
        items: [{ name: "Aashirvaad Atta 5kg", qty: 1, price: 280 }, { name: "Toor Dal 1kg", qty: 1, price: 170 }],
        createdAt: today() },
      { id: "o2", customerId: "c_s1", amount: 320, status: "packed", onCredit: true,
        items: [{ name: "Parle-G", qty: 6, price: 30 }, { name: "Lifebuoy Soap", qty: 2, price: 70 }],
        createdAt: daysFromNow(-1) },
      { id: "o3", customerId: "c_m1", amount: 1200, status: "ready", onCredit: true,
        items: [{ name: "Basmati Rice 5kg", qty: 1, price: 650 }, { name: "Sunflower Oil 1L", qty: 2, price: 275 }],
        createdAt: daysFromNow(-1) },
    ],
    inventory: [
      { id: "i1", name: "Britannia Bread", qty: 12, cost: 35, mrp: 45, expiry: daysFromNow(2) },
      { id: "i2", name: "Amul Milk 1L", qty: 24, cost: 58, mrp: 66, expiry: daysFromNow(1) },
      { id: "i3", name: "Aashirvaad Atta 5kg", qty: 18, cost: 240, mrp: 280 },
      { id: "i4", name: "Toor Dal 1kg", qty: 22, cost: 140, mrp: 170 },
      { id: "i5", name: "Sunflower Oil 1L", qty: 30, cost: 230, mrp: 275 },
      { id: "i6", name: "Parle-G 800g", qty: 40, cost: 22, mrp: 30 },
    ],
    shop: { name: "Sharma Kirana Store", owner: "Vikash Sharma" },
    brainInstalled: false,
  };
}

let cache: KhataState | null = null;
let serverSnapshot: KhataState | null = null;
const listeners = new Set<() => void>();

function read(): KhataState {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = seed();
    return cache;
  }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as KhataState) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

function write(next: KhataState) {
  cache = next;
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function getState(): KhataState {
  return read();
}

export function setState(updater: (s: KhataState) => KhataState) {
  write(updater(read()));
}

export function useKhata<T>(selector: (s: KhataState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(read()),
    () => selector(serverSnapshot ?? (serverSnapshot = seed())),
  );
}

export function resetKhata() {
  write(seed());
}

// ---- Mutations ----
export function recordRepayment(customerId: string, amount: number) {
  setState((s) => ({
    ...s,
    customers: s.customers.map((c) =>
      c.id === customerId
        ? {
            ...c,
            outstanding: Math.max(0, c.outstanding - amount),
            reliability: Math.min(100, c.reliability + 1),
            trustScore: Math.min(100, c.trustScore + 1),
            txns: [{ id: `r_${Date.now()}`, date: today(), kind: "repayment", amount }, ...c.txns],
          }
        : c,
    ),
  }));
}

export function addCreditOrder(customerId: string, items: { name: string; qty: number; price: number }[]) {
  const amount = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  setState((s) => ({
    ...s,
    customers: s.customers.map((c) =>
      c.id === customerId
        ? {
            ...c,
            outstanding: c.outstanding + amount,
            lastActivity: today(),
            txns: [{ id: `c_${Date.now()}`, date: today(), kind: "credit", amount, note: items.map(i => i.name).join(", "), items }, ...c.txns],
          }
        : c,
    ),
    orders: [
      { id: `o_${Date.now()}`, customerId, amount, status: "pending", onCredit: true, items, createdAt: today() },
      ...s.orders,
    ],
  }));
  return amount;
}

export function setOrderStatus(orderId: string, status: Order["status"]) {
  setState((s) => ({
    ...s,
    orders: s.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
  }));
}

export function installBrain() {
  setState((s) => ({ ...s, brainInstalled: true }));
}

export const formatINR = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");
