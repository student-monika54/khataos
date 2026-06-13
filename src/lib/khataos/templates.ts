// Template Response Engine — deterministic, low-latency replies for the
// most common financial conversations. The Financial Brain selects a
// template and the engine fills it with live values.

import type { Intent } from "./calls";

export type TemplateId =
  | "GREETING" | "BALANCE_INQUIRY" | "CREDIT_APPROVAL"
  | "CREDIT_CONDITIONAL" | "CREDIT_REJECTION" | "ORDER_CONFIRMATION"
  | "PAYMENT_REMINDER" | "SETTLEMENT_OFFER" | "COLLECTIONS_FOLLOWUP"
  | "REPAYMENT_THANKS" | "ESCALATION" | "FALLBACK";

export type TemplateVars = {
  customerName?: string;
  amount?: number;
  outstanding?: number;
  available?: number;
  limit?: number;
  trustScore?: number;
  dueDate?: string;
  items?: string;
  reason?: string;
  daysOverdue?: number;
};

const INR = (n?: number) =>
  n == null ? "" : "₹" + Math.round(n).toLocaleString("en-IN");

const T = {
  en: {
    GREETING: (v: TemplateVars) =>
      `Namaste ${v.customerName ?? ""}. This is KhataOS. How can I help today?`,
    BALANCE_INQUIRY: (v: TemplateVars) =>
      `Your outstanding khata is ${INR(v.outstanding)} and you have ${INR(v.available)} of credit available.`,
    CREDIT_APPROVAL: (v: TemplateVars) =>
      `Approved. ${INR(v.amount)} added to your khata. New outstanding is ${INR(v.outstanding)}. Trust score ${v.trustScore}.`,
    CREDIT_CONDITIONAL: (v: TemplateVars) =>
      `I can approve ${INR(v.amount)} only if you settle ${INR(v.outstanding)} this week. Shall I confirm?`,
    CREDIT_REJECTION: (v: TemplateVars) =>
      `Sorry, I can't extend more credit right now. ${v.reason ?? ""} Please clear ${INR(v.outstanding)} first.`,
    ORDER_CONFIRMATION: (v: TemplateVars) =>
      `Order confirmed: ${v.items ?? "your items"}. ${INR(v.amount)} added to khata. We'll have it ready shortly.`,
    PAYMENT_REMINDER: (v: TemplateVars) =>
      `Reminder: ${INR(v.outstanding)} is due on ${v.dueDate ?? "your due date"}. Want to pay now?`,
    SETTLEMENT_OFFER: (v: TemplateVars) =>
      `Noted. Settlement plan logged for ${v.dueDate ?? "next week"} for ${INR(v.outstanding)}.`,
    COLLECTIONS_FOLLOWUP: (v: TemplateVars) =>
      `${v.customerName ?? "Hello"}, ${INR(v.outstanding)} has been overdue ${v.daysOverdue ?? "a few"} days. Can we settle today?`,
    REPAYMENT_THANKS: (v: TemplateVars) =>
      `Received ${INR(v.amount)}. Outstanding is now ${INR(v.outstanding)}. Trust score is up — thank you.`,
    ESCALATION: () => `Connecting you to the shopkeeper now.`,
    FALLBACK: () => `I didn't catch that. Could you repeat?`,
  },
  hi: {
    GREETING: (v: TemplateVars) =>
      `Namaste ${v.customerName ?? ""}. Yeh KhataOS hai. Kaise madad karu?`,
    BALANCE_INQUIRY: (v: TemplateVars) =>
      `Aapka bakaaya ${INR(v.outstanding)} hai aur ${INR(v.available)} credit available hai.`,
    CREDIT_APPROVAL: (v: TemplateVars) =>
      `Approved. ${INR(v.amount)} aapke khate mein add ho gaya. Total bakaaya ${INR(v.outstanding)}.`,
    CREDIT_CONDITIONAL: (v: TemplateVars) =>
      `${INR(v.amount)} approve kar sakta hu agar aap iss hafte ${INR(v.outstanding)} chuka denge. Confirm?`,
    CREDIT_REJECTION: (v: TemplateVars) =>
      `Maaf kijiye, abhi aur udhaar nahi de sakta. Pehle ${INR(v.outstanding)} clear kar dijiye.`,
    ORDER_CONFIRMATION: (v: TemplateVars) =>
      `Order confirm: ${v.items ?? "items"}. ${INR(v.amount)} khate mein. Ready ho jayega.`,
    PAYMENT_REMINDER: (v: TemplateVars) =>
      `Yaad dilana: ${INR(v.outstanding)} ${v.dueDate ?? ""} ko due hai. Abhi pay karna chahenge?`,
    SETTLEMENT_OFFER: (v: TemplateVars) =>
      `Theek hai. ${INR(v.outstanding)} ka settlement ${v.dueDate ?? "agle hafte"} ke liye note kar liya.`,
    COLLECTIONS_FOLLOWUP: (v: TemplateVars) =>
      `${v.customerName ?? ""} ji, ${INR(v.outstanding)} ${v.daysOverdue ?? "kuch"} din se overdue hai. Aaj settle kar sakte hain?`,
    REPAYMENT_THANKS: (v: TemplateVars) =>
      `${INR(v.amount)} mil gaya. Bakaaya ${INR(v.outstanding)}. Trust score badh gaya — dhanyavaad.`,
    ESCALATION: () => `Aapko shopkeeper se connect kar raha hu.`,
    FALLBACK: () => `Samajh nahi paaya, ek baar phir boliye?`,
  },
};

export function pickTemplate(intent: Intent, decision?: "approve" | "reject" | "conditional"): TemplateId {
  switch (intent) {
    case "GREETING": return "GREETING";
    case "BALANCE_INQUIRY": return "BALANCE_INQUIRY";
    case "CREDIT_REQUEST":
    case "KHATA_ORDER":
      if (decision === "reject") return "CREDIT_REJECTION";
      if (decision === "conditional") return "CREDIT_CONDITIONAL";
      return intent === "KHATA_ORDER" ? "ORDER_CONFIRMATION" : "CREDIT_APPROVAL";
    case "REPAYMENT": return "REPAYMENT_THANKS";
    case "SETTLEMENT": return "SETTLEMENT_OFFER";
    case "COLLECTIONS_FOLLOWUP": return "COLLECTIONS_FOLLOWUP";
    case "TRUST_INQUIRY": return "BALANCE_INQUIRY";
    case "ESCALATE": return "ESCALATION";
    default: return "FALLBACK";
  }
}

export function renderTemplate(
  id: TemplateId, vars: TemplateVars, language: "en" | "hi" = "en",
): string {
  const bag = T[language] ?? T.en;
  const fn = (bag[id] ?? T.en[id] ?? T.en.FALLBACK) as (v: TemplateVars) => string;
  return fn(vars);
}

export const TEMPLATE_CATALOG: { id: TemplateId; label: string; agent: string }[] = [
  { id: "GREETING", label: "Greeting", agent: "InsightsAgent" },
  { id: "BALANCE_INQUIRY", label: "Balance Inquiry", agent: "InsightsAgent" },
  { id: "CREDIT_APPROVAL", label: "Credit Approval", agent: "CreditAgent" },
  { id: "CREDIT_CONDITIONAL", label: "Conditional Approval", agent: "CreditAgent" },
  { id: "CREDIT_REJECTION", label: "Credit Rejection", agent: "CreditAgent" },
  { id: "ORDER_CONFIRMATION", label: "Order Confirmation", agent: "CreditAgent" },
  { id: "PAYMENT_REMINDER", label: "Payment Reminder", agent: "CollectionsAgent" },
  { id: "SETTLEMENT_OFFER", label: "Settlement Offer", agent: "CollectionsAgent" },
  { id: "COLLECTIONS_FOLLOWUP", label: "Collections Follow-up", agent: "CollectionsAgent" },
  { id: "REPAYMENT_THANKS", label: "Repayment Thanks", agent: "CollectionsAgent" },
  { id: "ESCALATION", label: "Escalation", agent: "WorkingCapitalAgent" },
  { id: "FALLBACK", label: "Fallback", agent: "InsightsAgent" },
];
