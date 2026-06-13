// Localized short strings for the guided voice-commerce menu.
// English / Hindi (romanised) / Kannada (romanised) — keep voice TTS friendly.

import type { LangCode } from "./ivr";

type Bag = {
  mainMenu: string;
  whatOrder: string;
  itemAdded: (name: string, qty: number, unit: string) => string;
  itemRemoved: (name: string) => string;
  itemUpdated: (name: string, qty: number, unit: string) => string;
  cartEmpty: string;
  cartSummary: (lines: string, total: number) => string;
  notUnderstood: string;
  checkoutReview: (lines: string, total: number) => string;
  orderApproved: string;
  orderConditional: (amount: number) => string;
  orderRejected: (reason: string) => string;
  balance: (outstanding: number, available: number) => string;
  askCreditAmount: string;
  creditApproved: (amount: number) => string;
  creditConditional: (amount: number) => string;
  creditRejected: string;
  askCommitment: string;
  commitmentSaved: (text: string) => string;
  orderStatus: (status: string) => string;
  noOrders: string;
  farewell: string;
  invalidMenu: string;
};

const inr = (n: number) => "rupees " + Math.round(n);
const inrHi = (n: number) => Math.round(n) + " rupaye";
const inrKn = (n: number) => Math.round(n) + " rupayi";

const EN: Bag = {
  mainMenu: "Press 1 to place an order, 2 to check balance, 3 to request credit, 4 to track an order, 5 for payment commitment, or 6 to end the call.",
  whatOrder: "What would you like to order? You can say two kilo atta, or one litre oil.",
  itemAdded: (n, q, u) => `Added ${q} ${u} ${n}. What's next? Say done when finished.`,
  itemRemoved: (n) => `Removed ${n} from your cart.`,
  itemUpdated: (n, q, u) => `Updated ${n} to ${q} ${u}.`,
  cartEmpty: "Your cart is empty.",
  cartSummary: (lines, total) => `Your cart contains ${lines}. Total ${inr(total)}.`,
  notUnderstood: "Sorry, I didn't catch that. Please try again or say done to checkout.",
  checkoutReview: (lines, total) => `Confirming your order. ${lines}. Total ${inr(total)}.`,
  orderApproved: "Your order has been approved and forwarded to the shopkeeper.",
  orderConditional: (a) => `Approved up to ${inr(a)}. Please review with the shopkeeper.`,
  orderRejected: (r) => `Sorry, your order could not be approved. ${r}`,
  balance: (o, a) => `Your outstanding balance is ${inr(o)}. Available credit ${inr(a)}.`,
  askCreditAmount: "How much credit do you need? Please say the amount in rupees.",
  creditApproved: (a) => `Approved. ${inr(a)} has been added to your credit.`,
  creditConditional: (a) => `Conditional approval. Up to ${inr(a)} available if you clear your dues.`,
  creditRejected: "Sorry, your credit request was not approved at this time.",
  askCommitment: "When will you pay? You can say tomorrow, three days, or next week.",
  commitmentSaved: (t) => `Your commitment to pay ${t} has been recorded. Thank you.`,
  orderStatus: (s) => `Your latest order is currently ${s}.`,
  noOrders: "You don't have any active orders.",
  farewell: "Thank you for using KhataOS. Goodbye.",
  invalidMenu: "Please press a number between 1 and 6.",
};

const HI: Bag = {
  mainMenu: "Order ke liye 1 dabaayein, balance ke liye 2, credit ke liye 3, order track ke liye 4, payment commitment ke liye 5, ya call samaapt karne ke liye 6 dabaayein.",
  whatOrder: "Aap kya order karna chahte hain? Aap bol sakte hain do kilo atta, ya ek litre tel.",
  itemAdded: (n, q, u) => `${q} ${u} ${n} jod diya. Aage kya? Order pura ho gaya to done boliye.`,
  itemRemoved: (n) => `${n} cart se hata diya.`,
  itemUpdated: (n, q, u) => `${n} ko ${q} ${u} kar diya.`,
  cartEmpty: "Aapka cart khali hai.",
  cartSummary: (lines, total) => `Aapke cart mein ${lines} hai. Kul ${inrHi(total)}.`,
  notUnderstood: "Maaf kijiye, samajh nahi aaya. Phir se boliye ya done boliye.",
  checkoutReview: (lines, total) => `Order confirm kar raha hoon. ${lines}. Kul ${inrHi(total)}.`,
  orderApproved: "Aapka order approve ho gaya aur dukandar ko bhej diya gaya hai.",
  orderConditional: (a) => `${inrHi(a)} tak approve hua. Dukandar se baat kijiye.`,
  orderRejected: (r) => `Maaf kijiye, aapka order approve nahi ho saka. ${r}`,
  balance: (o, a) => `Aapka baki balance ${inrHi(o)} hai. Available credit ${inrHi(a)}.`,
  askCreditAmount: "Aapko kitna credit chahiye? Rupaye mein amount boliye.",
  creditApproved: (a) => `Approve ho gaya. ${inrHi(a)} aapke credit mein jod diya.`,
  creditConditional: (a) => `Conditional approval. Bakaaya chukane par ${inrHi(a)} milega.`,
  creditRejected: "Maaf kijiye, is samay credit approve nahi ho saka.",
  askCommitment: "Aap kab payment karenge? Boliye kal, teen din, ya agle hafte.",
  commitmentSaved: (t) => `${t} payment ki commitment record kar li gayi. Dhanyavaad.`,
  orderStatus: (s) => `Aapka latest order abhi ${s} hai.`,
  noOrders: "Aapke koi active orders nahi hain.",
  farewell: "KhataOS use karne ke liye dhanyavaad. Namaskaar.",
  invalidMenu: "Kripya 1 se 6 ke beech ka number dabaayein.",
};

const KN: Bag = {
  mainMenu: "Order ge ondu, balance ge eradu, credit ge mooru, order track ge naalku, payment commitment ge aidu, athava call mugisalu aaru ottirisi.",
  whatOrder: "Nimage enu order maadabeku? Eradu kilo atta athava ondu litre yenne anta heli.",
  itemAdded: (n, q, u) => `${q} ${u} ${n} seerisidde. Mundenu? Mugiyitu andre done annu heli.`,
  itemRemoved: (n) => `${n} cart inda tegidide.`,
  itemUpdated: (n, q, u) => `${n} annu ${q} ${u} ge badalisidde.`,
  cartEmpty: "Nimma cart khaali ide.",
  cartSummary: (lines, total) => `Nimma cart inda ${lines} ide. Ottu ${inrKn(total)}.`,
  notUnderstood: "Kshamisi, kelisalilla. Innondu sala heli athava done annu heli.",
  checkoutReview: (lines, total) => `Order confirm maaduttiddene. ${lines}. Ottu ${inrKn(total)}.`,
  orderApproved: "Nimma order anumodisalaagide mattu angadiyavarige kalisalaagide.",
  orderConditional: (a) => `${inrKn(a)} varegu anumodisalaagide. Angadiyavara jote charchisi.`,
  orderRejected: (r) => `Kshamisi, nimma order anumodisalu saadhyavaagilla. ${r}`,
  balance: (o, a) => `Nimma baaki ${inrKn(o)}. Labhya credit ${inrKn(a)}.`,
  askCreditAmount: "Nimage eshtu credit beku? Rupayi alli motta heli.",
  creditApproved: (a) => `Anumodanege. ${inrKn(a)} nimma credit ge seerisalaagide.`,
  creditConditional: (a) => `Shaartabaddha anumodane. Baaki tirisidre ${inrKn(a)} sigutte.`,
  creditRejected: "Kshamisi, ee samaya credit anumodisalu saadhyavilla.",
  askCommitment: "Ninu yaavaaga paavati maaduttiri? Naale, mooru dina, athava mundina vaara annu heli.",
  commitmentSaved: (t) => `${t} paavati maaduva baddhate daakhalisalagide. Dhanyavaada.`,
  orderStatus: (s) => `Nimma kone order ee samaya ${s} agide.`,
  noOrders: "Nimage yaava sakriya orders illa.",
  farewell: "KhataOS upayogisidakkaagi dhanyavaadagalu. Namaskara.",
  invalidMenu: "Dayavittu 1 rinda 6 ra naduve ondu sankhye ottirisi.",
};

const ALL: Record<LangCode, Bag> = { en: EN, hi: HI, kn: KN };

export const voiceMenu = (code: LangCode): Bag => ALL[code] ?? EN;
