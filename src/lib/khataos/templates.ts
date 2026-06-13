// Template Response Engine — deterministic, low-latency, multilingual replies.
// The Financial Brain selects a template and the engine fills it with values.

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

const en: Bag = {
  GREETING: (v) => `Namaste ${v.customerName ?? ""}. This is KhataOS. How can I help today?`,
  BALANCE_INQUIRY: (v) => `Your outstanding khata is ${INR(v.outstanding)} and you have ${INR(v.available)} of credit available.`,
  CREDIT_APPROVAL: (v) => `Approved. ${INR(v.amount)} added to your khata. New outstanding is ${INR(v.outstanding)}. Trust score ${v.trustScore}.`,
  CREDIT_CONDITIONAL: (v) => `I can approve ${INR(v.amount)} only if you settle ${INR(v.outstanding)} this week. Shall I confirm?`,
  CREDIT_REJECTION: (v) => `Sorry, I can't extend more credit right now. ${v.reason ?? ""} Please clear ${INR(v.outstanding)} first.`,
  ORDER_CONFIRMATION: (v) => `Order confirmed: ${v.items ?? "your items"}. ${INR(v.amount)} added to khata.`,
  PAYMENT_REMINDER: (v) => `Reminder: ${INR(v.outstanding)} is due on ${v.dueDate ?? "your due date"}. Want to pay now?`,
  SETTLEMENT_OFFER: (v) => `Noted. Settlement plan logged for ${v.dueDate ?? "next week"} for ${INR(v.outstanding)}.`,
  COLLECTIONS_FOLLOWUP: (v) => `${v.customerName ?? "Hello"}, ${INR(v.outstanding)} has been overdue ${v.daysOverdue ?? "a few"} days. Can we settle today?`,
  REPAYMENT_THANKS: (v) => `Received ${INR(v.amount)}. Outstanding is now ${INR(v.outstanding)}. Trust score is up — thank you.`,
  PAYMENT_CONFIRMATION: (v) => `Thank you. I've noted your payment of ${INR(v.amount) || "the amount"}. Outstanding is now ${INR(v.outstanding)}.`,
  PAYMENT_PROMISE: (v) => `Got it. I've recorded your promise to pay ${INR(v.outstanding)} by ${v.dueDate ?? "your committed date"}.`,
  GENERAL_HELP: () => `I can help with your balance, credit requests, orders, or payments. What would you like?`,
  END_CALL: (v) => `Thank you ${v.customerName ?? ""}. Have a great day. Goodbye.`,
  ESCALATION: () => `Connecting you to the shopkeeper now.`,
  FALLBACK: () => `I didn't catch that. Could you repeat?`,
};

const hi: Bag = {
  GREETING: (v) => `नमस्ते ${v.customerName ?? ""}। यह KhataOS है। मैं कैसे मदद कर सकता हूँ?`,
  BALANCE_INQUIRY: (v) => `आपका बकाया ${INR(v.outstanding)} है और ${INR(v.available)} क्रेडिट उपलब्ध है।`,
  CREDIT_APPROVAL: (v) => `मंज़ूर। ${INR(v.amount)} आपके खाते में जोड़ दिया। कुल बकाया ${INR(v.outstanding)}।`,
  CREDIT_CONDITIONAL: (v) => `${INR(v.amount)} मंज़ूर कर सकता हूँ अगर आप इस हफ़्ते ${INR(v.outstanding)} चुका दें।`,
  CREDIT_REJECTION: (v) => `माफ़ कीजिए, अभी और उधार नहीं दे सकता। पहले ${INR(v.outstanding)} चुका दीजिए।`,
  ORDER_CONFIRMATION: (v) => `ऑर्डर पक्का: ${v.items ?? "सामान"}। ${INR(v.amount)} खाते में जोड़ दिया।`,
  PAYMENT_REMINDER: (v) => `याद दिलाना: ${INR(v.outstanding)} ${v.dueDate ?? ""} को देना है। अभी भुगतान करेंगे?`,
  SETTLEMENT_OFFER: (v) => `ठीक है। ${INR(v.outstanding)} का settlement ${v.dueDate ?? "अगले हफ़्ते"} के लिए नोट कर लिया।`,
  COLLECTIONS_FOLLOWUP: (v) => `${v.customerName ?? ""} जी, ${INR(v.outstanding)} ${v.daysOverdue ?? "कुछ"} दिन से overdue है। आज settle कर सकते हैं?`,
  REPAYMENT_THANKS: (v) => `${INR(v.amount)} मिल गया। बकाया ${INR(v.outstanding)}। धन्यवाद।`,
  PAYMENT_CONFIRMATION: (v) => `धन्यवाद। आपका ${INR(v.amount) || "भुगतान"} दर्ज कर लिया। बाकी बकाया ${INR(v.outstanding)}।`,
  PAYMENT_PROMISE: (v) => `ठीक है। ${INR(v.outstanding)} ${v.dueDate ?? "तय तारीख"} तक देने का वादा नोट कर लिया।`,
  GENERAL_HELP: () => `मैं बकाया, उधार, ऑर्डर या भुगतान में मदद कर सकता हूँ। क्या चाहिए?`,
  END_CALL: (v) => `धन्यवाद ${v.customerName ?? ""}। आपका दिन शुभ हो। अलविदा।`,
  ESCALATION: () => `आपको दुकानदार से जोड़ रहा हूँ।`,
  FALLBACK: () => `समझ नहीं पाया, एक बार फिर बोलिए।`,
};

const hinglish: Bag = {
  GREETING: (v) => `Namaste ${v.customerName ?? ""}. Yeh KhataOS hai. Kaise madad karu?`,
  BALANCE_INQUIRY: (v) => `Aapka bakaaya ${INR(v.outstanding)} hai aur ${INR(v.available)} credit available hai.`,
  CREDIT_APPROVAL: (v) => `Approved. ${INR(v.amount)} aapke khate mein add ho gaya. Total bakaaya ${INR(v.outstanding)}.`,
  CREDIT_CONDITIONAL: (v) => `${INR(v.amount)} approve kar sakta hu agar aap iss hafte ${INR(v.outstanding)} chuka denge. Confirm?`,
  CREDIT_REJECTION: (v) => `Maaf kijiye, abhi aur udhaar nahi de sakta. Pehle ${INR(v.outstanding)} clear kar dijiye.`,
  ORDER_CONFIRMATION: (v) => `Order confirm: ${v.items ?? "items"}. ${INR(v.amount)} khate mein add ho gaya.`,
  PAYMENT_REMINDER: (v) => `Yaad dilana: ${INR(v.outstanding)} ${v.dueDate ?? ""} ko due hai. Abhi pay karenge?`,
  SETTLEMENT_OFFER: (v) => `Theek hai. ${INR(v.outstanding)} ka settlement ${v.dueDate ?? "agle hafte"} ke liye note kar liya.`,
  COLLECTIONS_FOLLOWUP: (v) => `${v.customerName ?? ""} ji, ${INR(v.outstanding)} ${v.daysOverdue ?? "kuch"} din se overdue hai. Aaj settle kar sakte hain?`,
  REPAYMENT_THANKS: (v) => `${INR(v.amount)} mil gaya. Bakaaya ${INR(v.outstanding)}. Trust score badh gaya — dhanyavaad.`,
  PAYMENT_CONFIRMATION: (v) => `Dhanyavaad. Aapka ${INR(v.amount) || "payment"} note kar liya. Bakaaya ${INR(v.outstanding)}.`,
  PAYMENT_PROMISE: (v) => `Theek hai. ${INR(v.outstanding)} ${v.dueDate ?? "tay tareekh"} tak dene ka vaada note kar liya.`,
  GENERAL_HELP: () => `Main balance, udhaar, order ya payment mein madad kar sakta hu. Kya chahiye?`,
  END_CALL: (v) => `Dhanyavaad ${v.customerName ?? ""}. Aapka din shubh ho. Alvida.`,
  ESCALATION: () => `Aapko shopkeeper se connect kar raha hu.`,
  FALLBACK: () => `Samajh nahi paaya, ek baar phir boliye?`,
};

const kn: Bag = {
  GREETING: (v) => `ನಮಸ್ಕಾರ ${v.customerName ?? ""}. ಇದು KhataOS. ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`,
  BALANCE_INQUIRY: (v) => `ನಿಮ್ಮ ಬಾಕಿ ${INR(v.outstanding)}, ಲಭ್ಯ ಸಾಲ ${INR(v.available)}.`,
  CREDIT_APPROVAL: (v) => `ಒಪ್ಪಿಗೆ. ${INR(v.amount)} ನಿಮ್ಮ ಖಾತೆಗೆ ಸೇರಿಸಲಾಗಿದೆ. ಒಟ್ಟು ಬಾಕಿ ${INR(v.outstanding)}.`,
  CREDIT_CONDITIONAL: (v) => `${INR(v.amount)} ಒಪ್ಪಬಹುದು, ಆದರೆ ಈ ವಾರ ${INR(v.outstanding)} ಪಾವತಿಸಬೇಕು.`,
  CREDIT_REJECTION: (v) => `ಕ್ಷಮಿಸಿ, ಈಗ ಹೆಚ್ಚಿನ ಸಾಲ ಸಾಧ್ಯವಿಲ್ಲ. ಮೊದಲು ${INR(v.outstanding)} ಪಾವತಿಸಿ.`,
  ORDER_CONFIRMATION: (v) => `ಆರ್ಡರ್ ದೃಢಪಡಿಸಲಾಗಿದೆ: ${v.items ?? "ವಸ್ತುಗಳು"}. ${INR(v.amount)} ಖಾತೆಗೆ.`,
  PAYMENT_REMINDER: (v) => `ನೆನಪು: ${INR(v.outstanding)} ${v.dueDate ?? ""} ರಂದು ಬಾಕಿ. ಈಗ ಪಾವತಿಸುವಿರಾ?`,
  SETTLEMENT_OFFER: (v) => `ಸರಿ. ${INR(v.outstanding)} ${v.dueDate ?? "ಮುಂದಿನ ವಾರ"} ರೊಳಗೆ settlement ನೋಂದಣಿ.`,
  COLLECTIONS_FOLLOWUP: (v) => `${v.customerName ?? ""}, ${INR(v.outstanding)} ${v.daysOverdue ?? "ಕೆಲವು"} ದಿನಗಳಿಂದ ಬಾಕಿ. ಇಂದು ಪಾವತಿಸುವಿರಾ?`,
  REPAYMENT_THANKS: (v) => `${INR(v.amount)} ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ಬಾಕಿ ${INR(v.outstanding)}. ಧನ್ಯವಾದ.`,
  PAYMENT_CONFIRMATION: (v) => `ಧನ್ಯವಾದ. ${INR(v.amount) || "ಪಾವತಿ"} ದಾಖಲಿಸಲಾಗಿದೆ. ಬಾಕಿ ${INR(v.outstanding)}.`,
  PAYMENT_PROMISE: (v) => `ಸರಿ. ${INR(v.outstanding)} ${v.dueDate ?? "ನಿಗದಿತ ದಿನಾಂಕ"} ರೊಳಗೆ ಪಾವತಿಸುವ ಭರವಸೆ ದಾಖಲು.`,
  GENERAL_HELP: () => `ಬಾಕಿ, ಸಾಲ, ಆರ್ಡರ್ ಅಥವಾ ಪಾವತಿಯಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಏನು ಬೇಕು?`,
  END_CALL: (v) => `ಧನ್ಯವಾದ ${v.customerName ?? ""}. ಶುಭ ದಿನ. ಬಾಯ್.`,
  ESCALATION: () => `ನಾನು ನಿಮ್ಮನ್ನು ಅಂಗಡಿಯವರಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇನೆ.`,
  FALLBACK: () => `ಅರ್ಥವಾಗಲಿಲ್ಲ, ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ.`,
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
    case "Hinglish": return "hinglish";
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
