// Template Response Engine — deterministic, low-latency, multilingual replies.
// Three locked languages: English (en), Hindi (hi), Kannada (kn).
// Language is selected via IVR DTMF menu (1/2/3) and locked for the call.
// Hinglish kept only as alias for hi for backward compatibility.

import type { Intent } from "./calls";

export type TemplateId =
  | "GREETING" | "BALANCE_INQUIRY" | "CREDIT_APPROVAL"
  | "CREDIT_CONDITIONAL" | "CREDIT_REJECTION" | "ORDER_CONFIRMATION"
  | "PAYMENT_REMINDER" | "SETTLEMENT_OFFER" | "COLLECTIONS_FOLLOWUP"
  | "REPAYMENT_THANKS" | "PAYMENT_CONFIRMATION" | "PAYMENT_PROMISE"
  | "GENERAL_HELP" | "END_CALL" | "ESCALATION" | "FALLBACK";

export type TemplateLang = "en" | "hi" | "hinglish" | "kn";

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

type Bag = Record<TemplateId, (v: TemplateVars) => string>;

// ===== ENGLISH (LOCKED) =====
const en: Bag = {
  GREETING: () => `Welcome to KhataOS. How can I help you today?`,
  BALANCE_INQUIRY: (v) => `Your current outstanding balance is ${INR(v.outstanding)}.`,
  CREDIT_APPROVAL: (v) => `Your credit request for ${INR(v.amount)} has been approved.`,
  CREDIT_CONDITIONAL: (v) => `I can approve ${INR(v.amount)} if you settle ${INR(v.outstanding)} this week.`,
  CREDIT_REJECTION: () => `Unfortunately your credit request cannot be approved at this time.`,
  ORDER_CONFIRMATION: (v) => v.items
    ? `I have added the following items to your khata: ${v.items}.`
    : `Your order has been added to your khata account.`,
  PAYMENT_REMINDER: (v) => `You currently have an outstanding balance of ${INR(v.outstanding)}.`,
  SETTLEMENT_OFFER: () => `Your repayment commitment has been recorded.`,
  COLLECTIONS_FOLLOWUP: (v) => `You currently have an outstanding balance of ${INR(v.outstanding)}.`,
  REPAYMENT_THANKS: () => `Your payment has been recorded successfully.`,
  PAYMENT_CONFIRMATION: () => `Your payment has been recorded successfully.`,
  PAYMENT_PROMISE: () => `Your repayment commitment has been recorded.`,
  GENERAL_HELP: () => `I can help with balances, credit requests, repayments, and account information.`,
  END_CALL: () => `Thank you for calling KhataOS. Have a great day.`,
  ESCALATION: () => `Connecting you to the shopkeeper now.`,
  FALLBACK: () => `I can help with balances, credit requests, repayments, and account information. What would you like?`,
};

// ===== HINDI (LOCKED, Romanised for reliable Polly TTS) =====
const hi: Bag = {
  GREETING: () => `KhataOS mein aapka swagat hai. Main aaj aapki kis prakar sahayata kar sakta hoon?`,
  BALANCE_INQUIRY: (v) => `Aapka vartamaan baki balance ${INR(v.outstanding)} hai.`,
  CREDIT_APPROVAL: (v) => `${INR(v.amount)} ke liye aapka credit request approve kar diya gaya hai.`,
  CREDIT_CONDITIONAL: (v) => `${INR(v.amount)} approve kar sakta hoon agar aap is hafte ${INR(v.outstanding)} chuka denge.`,
  CREDIT_REJECTION: () => `Maaf kijiye, is samay aapka credit request approve nahi kiya ja sakta.`,
  ORDER_CONFIRMATION: (v) => v.items
    ? `Maine aapke khate mein nimnalikhit samaan jod diya hai: ${v.items}.`
    : `Aapka order aapke khata mein jod diya gaya hai.`,
  PAYMENT_REMINDER: (v) => `Aap par vartamaan mein ${INR(v.outstanding)} ka baki balance hai.`,
  SETTLEMENT_OFFER: () => `Aapki payment commitment record kar li gayi hai.`,
  COLLECTIONS_FOLLOWUP: (v) => `Aap par vartamaan mein ${INR(v.outstanding)} ka baki balance hai.`,
  REPAYMENT_THANKS: () => `Aapka payment safalta purvak record kar liya gaya hai.`,
  PAYMENT_CONFIRMATION: () => `Aapka payment safalta purvak record kar liya gaya hai.`,
  PAYMENT_PROMISE: () => `Aapki payment commitment record kar li gayi hai.`,
  GENERAL_HELP: () => `Main balance, credit request, payment aur account sambandhit jankari mein sahayata kar sakta hoon.`,
  END_CALL: () => `KhataOS ko call karne ke liye dhanyavaad. Aapka din shubh ho.`,
  ESCALATION: () => `Main aapko dukandar se jod raha hoon.`,
  FALLBACK: () => `Main balance, credit request, payment aur account sambandhit jankari mein sahayata kar sakta hoon. Aap kya chahte hain?`,
};

// hinglish alias = hi (kept for backwards compatibility with older code paths)
const hinglish: Bag = hi;

// ===== KANNADA (LOCKED) =====
const kn: Bag = {
  GREETING: () => `KhataOS ge swagatha. Naanu indu nimage hege sahaaya maadabahudu?`,
  BALANCE_INQUIRY: (v) => `Nimma prastuta baaki motta ${INR(v.outstanding)} aagide.`,
  CREDIT_APPROVAL: (v) => `${INR(v.amount)} credit vinantiyannu anumodisalagide.`,
  CREDIT_CONDITIONAL: (v) => `${INR(v.amount)} anumodisabahudu, aadare ee vaara ${INR(v.outstanding)} paavatisabeku.`,
  CREDIT_REJECTION: () => `Kshamisi, ee samayadalli nimma credit vinantiyannu anumodisalu saadhyavilla.`,
  ORDER_CONFIRMATION: (v) => v.items
    ? `Naanu ee vastugalannu nimma khaategе seerisidde: ${v.items}.`
    : `Nimma order annu nimma khaategе seerisalagide.`,
  PAYMENT_REMINDER: (v) => `Nimma mele ${INR(v.outstanding)} baaki motta ide.`,
  SETTLEMENT_OFFER: () => `Nimma paavati baddhateyannu daakhalisalaagide.`,
  COLLECTIONS_FOLLOWUP: (v) => `Nimma mele ${INR(v.outstanding)} baaki motta ide.`,
  REPAYMENT_THANKS: () => `Nimma paavatiyannu yashasviyaagi daakhalisalaagide.`,
  PAYMENT_CONFIRMATION: () => `Nimma paavatiyannu yashasviyaagi daakhalisalaagide.`,
  PAYMENT_PROMISE: () => `Nimma paavati baddhateyannu daakhalisalaagide.`,
  GENERAL_HELP: () => `Naanu balance, credit, paavati mattu khaate maahitiyalli sahaaya maadabahudu.`,
  END_CALL: () => `KhataOS ge kare maadidakkaagi dhanyavaadagalu. Olleya dina.`,
  ESCALATION: () => `Naanu nimmannu angadiyavarige sampark maaduttiddene.`,
  FALLBACK: () => `Naanu balance, credit, paavati mattu khaate maahitiyalli sahaaya maadabahudu. Nimage enu beku?`,
};

const T: Record<TemplateLang, Bag> = { en, hi, hinglish, kn };

export function pickTemplate(intent: Intent, decision?: "approve" | "reject" | "conditional"): TemplateId {
  switch (intent) {
    case "END_CALL": return "END_CALL";
    case "GREETING": return "GREETING";
    case "BALANCE_INQUIRY": return "BALANCE_INQUIRY";
    case "CREDIT_REQUEST":
    case "KHATA_ORDER":
      if (decision === "reject") return "CREDIT_REJECTION";
      if (decision === "conditional") return "CREDIT_CONDITIONAL";
      return intent === "KHATA_ORDER" ? "ORDER_CONFIRMATION" : "CREDIT_APPROVAL";
    case "REPAYMENT": return "REPAYMENT_THANKS";
    case "PAYMENT_CONFIRMATION": return "PAYMENT_CONFIRMATION";
    case "PAYMENT_PROMISE": return "PAYMENT_PROMISE";
    case "SETTLEMENT": return "SETTLEMENT_OFFER";
    case "COLLECTIONS_FOLLOWUP": return "COLLECTIONS_FOLLOWUP";
    case "TRUST_INQUIRY": return "BALANCE_INQUIRY";
    case "ESCALATE": return "ESCALATION";
    case "GENERAL_HELP": return "GENERAL_HELP";
    default: return "FALLBACK";
  }
}

export function languageToTemplateLang(lang: string): TemplateLang {
  switch (lang) {
    case "Hindi": return "hi";
    case "Hinglish": return "hi";
    case "Kannada": return "kn";
    case "English": return "en";
    default: return "en";
  }
}

export function renderTemplate(
  id: TemplateId, vars: TemplateVars, language: TemplateLang = "en",
): string {
  const bag = T[language] ?? T.en;
  const fn = bag[id] ?? T.en[id] ?? T.en.FALLBACK;
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
  { id: "PAYMENT_CONFIRMATION", label: "Payment Confirmation", agent: "CollectionsAgent" },
  { id: "PAYMENT_PROMISE", label: "Payment Promise", agent: "CollectionsAgent" },
  { id: "GENERAL_HELP", label: "General Help", agent: "InsightsAgent" },
  { id: "END_CALL", label: "End Call", agent: "InsightsAgent" },
  { id: "ESCALATION", label: "Escalation", agent: "WorkingCapitalAgent" },
  { id: "FALLBACK", label: "Fallback", agent: "InsightsAgent" },
];
