// Predefined SKU catalog for the guided voice-commerce agent.
// Closed set — the parser only matches against these SKUs.
// Each SKU has multilingual aliases (English, Hindi-Romanised, Kannada-Romanised)
// for deterministic matching from Twilio STT output.

export type Sku = {
  id: string;
  name: string;          // canonical display name (English)
  unit: "kg" | "litre" | "pcs" | "pack";
  pricePerUnit: number;  // INR
  defaultQty: number;    // when user says "add X" with no quantity
  aliases: string[];     // lowercased, ASCII + native script tokens
};

export type LangKey = "en" | "hi" | "kn";

// Localized display names per SKU id. Used so order items render in the
// customer's spoken language on the orders screen.
export const SKU_NAMES_BY_LANG: Record<string, { en: string; hi: string; kn: string }> = {
  atta:       { en: "Atta",       hi: "आटा",         kn: "ಗೋಧಿ ಹಿಟ್ಟು" },
  maida:      { en: "Maida",      hi: "मैदा",        kn: "ಮೈದಾ" },
  rice:       { en: "Rice",       hi: "चावल",        kn: "ಅಕ್ಕಿ" },
  oil:        { en: "Oil",        hi: "तेल",         kn: "ಎಣ್ಣೆ" },
  ghee:       { en: "Ghee",       hi: "घी",          kn: "ತುಪ್ಪ" },
  butter:     { en: "Butter",     hi: "मक्खन",       kn: "ಬೆಣ್ಣೆ" },
  paneer:     { en: "Paneer",     hi: "पनीर",        kn: "ಪನೀರ್" },
  curd:       { en: "Curd",       hi: "दही",         kn: "ಮೊಸರು" },
  sugar:      { en: "Sugar",      hi: "चीनी",        kn: "ಸಕ್ಕರೆ" },
  jaggery:    { en: "Jaggery",    hi: "गुड़",         kn: "ಬೆಲ್ಲ" },
  milk:       { en: "Milk",       hi: "दूध",         kn: "ಹಾಲು" },
  bread:      { en: "Bread",      hi: "ब्रेड",        kn: "ಬ್ರೆಡ್" },
  tea:        { en: "Tea",        hi: "चाय",         kn: "ಚಹಾ" },
  coffee:     { en: "Coffee",     hi: "कॉफ़ी",        kn: "ಕಾಫಿ" },
  soap:       { en: "Soap",       hi: "साबुन",       kn: "ಸಾಬೂನು" },
  shampoo:    { en: "Shampoo",    hi: "शैम्पू",       kn: "ಶಾಂಪೂ" },
  toothpaste: { en: "Toothpaste", hi: "टूथपेस्ट",     kn: "ಟೂತ್‌ಪೇಸ್ಟ್" },
  detergent:  { en: "Detergent",  hi: "डिटर्जेंट",    kn: "ಡಿಟರ್ಜೆಂಟ್" },
  salt:       { en: "Salt",       hi: "नमक",         kn: "ಉಪ್ಪು" },
  biscuits:   { en: "Biscuits",   hi: "बिस्किट",      kn: "ಬಿಸ್ಕೆಟ್" },
  eggs:       { en: "Eggs",       hi: "अंडे",         kn: "ಮೊಟ್ಟೆ" },
  dal:        { en: "Dal",        hi: "दाल",         kn: "ಬೇಳೆ" },
  onion:      { en: "Onion",      hi: "प्याज़",        kn: "ಈರುಳ್ಳಿ" },
  potato:     { en: "Potato",     hi: "आलू",         kn: "ಆಲೂಗಡ್ಡೆ" },
  tomato:     { en: "Tomato",     hi: "टमाटर",       kn: "ಟೊಮ್ಯಾಟೊ" },
  chilli:     { en: "Chilli",     hi: "मिर्च",        kn: "ಮೆಣಸಿನಕಾಯಿ" },
  garlic:     { en: "Garlic",     hi: "लहसुन",       kn: "ಬೆಳ್ಳುಳ್ಳಿ" },
  ginger:     { en: "Ginger",     hi: "अदरक",       kn: "ಶುಂಠಿ" },
  turmeric:   { en: "Turmeric",   hi: "हल्दी",        kn: "ಅರಿಶಿನ" },
  masala:     { en: "Masala",     hi: "मसाला",       kn: "ಮಸಾಲೆ" },
  noodles:    { en: "Noodles",    hi: "नूडल्स",       kn: "ನೂಡಲ್ಸ್" },
};

export function localizedName(skuId: string, lang: LangKey, fallback: string): string {
  return SKU_NAMES_BY_LANG[skuId]?.[lang] ?? fallback;
}

// Localized unit labels.
export const UNIT_LABELS: Record<LangKey, Record<string, string>> = {
  en: { kg: "kg", litre: "litre", pcs: "pcs", pack: "pack", g: "g", ml: "ml", dozen: "dozen", L: "L" },
  hi: { kg: "किलो", litre: "लीटर", pcs: "नग", pack: "पैकेट", g: "ग्राम", ml: "मि.ली.", dozen: "दर्जन", L: "लीटर" },
  kn: { kg: "ಕೆ.ಜಿ.", litre: "ಲೀಟರ್", pcs: "ತುಂಡು", pack: "ಪ್ಯಾಕ್", g: "ಗ್ರಾಂ", ml: "ಮಿ.ಲೀ.", dozen: "ಡಜನ್", L: "ಲೀಟರ್" },
};

export const CATALOG: Sku[] = [
  { id: "atta",     name: "Atta",     unit: "kg",    pricePerUnit: 50,  defaultQty: 1, aliases: ["atta","aata","flour","wheat","gehu","gehun","godhi"] },
  { id: "maida",    name: "Maida",    unit: "kg",    pricePerUnit: 55,  defaultQty: 1, aliases: ["maida","refined flour","all purpose flour"] },
  { id: "rice",     name: "Rice",     unit: "kg",    pricePerUnit: 60,  defaultQty: 1, aliases: ["rice","chawal","akki","basmati"] },
  { id: "oil",      name: "Oil",      unit: "litre", pricePerUnit: 140, defaultQty: 1, aliases: ["oil","tel","tail","enne","yenne","sunflower"] },
  { id: "ghee",     name: "Ghee",     unit: "kg",    pricePerUnit: 600, defaultQty: 1, aliases: ["ghee","ghi","tuppa","desi ghee"] },
  { id: "butter",   name: "Butter",   unit: "pcs",   pricePerUnit: 60,  defaultQty: 1, aliases: ["butter","makhan","benne"] },
  { id: "paneer",   name: "Paneer",   unit: "kg",    pricePerUnit: 350, defaultQty: 1, aliases: ["paneer","cottage cheese"] },
  { id: "curd",     name: "Curd",     unit: "kg",    pricePerUnit: 80,  defaultQty: 1, aliases: ["curd","dahi","mosaru","yoghurt","yogurt"] },
  { id: "sugar",    name: "Sugar",    unit: "kg",    pricePerUnit: 45,  defaultQty: 1, aliases: ["sugar","cheeni","chini","sakkare","sakkrey"] },
  { id: "jaggery",  name: "Jaggery",  unit: "kg",    pricePerUnit: 80,  defaultQty: 1, aliases: ["jaggery","gur","gud","bella","bellam"] },
  { id: "milk",     name: "Milk",     unit: "litre", pricePerUnit: 60,  defaultQty: 1, aliases: ["milk","doodh","dudh","haalu","halu"] },
  { id: "bread",    name: "Bread",    unit: "pcs",   pricePerUnit: 45,  defaultQty: 1, aliases: ["bread","double roti","pav"] },
  { id: "tea",      name: "Tea",      unit: "pack",  pricePerUnit: 120, defaultQty: 1, aliases: ["tea","chai","chaha","cha"] },
  { id: "coffee",   name: "Coffee",   unit: "pack",  pricePerUnit: 180, defaultQty: 1, aliases: ["coffee","kaapi","kafi"] },
  { id: "soap",     name: "Soap",     unit: "pcs",   pricePerUnit: 30,  defaultQty: 1, aliases: ["soap","sabun","sabbu"] },
  { id: "shampoo",  name: "Shampoo",  unit: "pcs",   pricePerUnit: 90,  defaultQty: 1, aliases: ["shampoo"] },
  { id: "toothpaste", name: "Toothpaste", unit: "pcs", pricePerUnit: 75, defaultQty: 1, aliases: ["toothpaste","colgate","paste"] },
  { id: "detergent", name: "Detergent", unit: "pack", pricePerUnit: 120, defaultQty: 1, aliases: ["detergent","surf","tide","ariel","washing powder"] },
  { id: "salt",     name: "Salt",     unit: "kg",    pricePerUnit: 25,  defaultQty: 1, aliases: ["salt","namak","uppu"] },
  { id: "biscuits", name: "Biscuits", unit: "pack",  pricePerUnit: 30,  defaultQty: 1, aliases: ["biscuits","biscuit","parle","bisket"] },
  { id: "eggs",     name: "Eggs",     unit: "pcs",   pricePerUnit: 8,   defaultQty: 6, aliases: ["eggs","egg","anda","ande","mottae","motte"] },
  { id: "dal",      name: "Dal",      unit: "kg",    pricePerUnit: 140, defaultQty: 1, aliases: ["dal","daal","toor","moong","chana","bele"] },
  { id: "onion",    name: "Onion",    unit: "kg",    pricePerUnit: 40,  defaultQty: 1, aliases: ["onion","pyaaz","pyaz","kanda","eerulli"] },
  { id: "potato",   name: "Potato",   unit: "kg",    pricePerUnit: 35,  defaultQty: 1, aliases: ["potato","aloo","batata","aalu"] },
  { id: "tomato",   name: "Tomato",   unit: "kg",    pricePerUnit: 40,  defaultQty: 1, aliases: ["tomato","tamatar","tomatto"] },
  { id: "chilli",   name: "Chilli",   unit: "kg",    pricePerUnit: 80,  defaultQty: 1, aliases: ["chilli","chili","mirch","menasinakai"] },
  { id: "garlic",   name: "Garlic",   unit: "kg",    pricePerUnit: 200, defaultQty: 1, aliases: ["garlic","lehsun","bellulli"] },
  { id: "ginger",   name: "Ginger",   unit: "kg",    pricePerUnit: 120, defaultQty: 1, aliases: ["ginger","adrak","shunti"] },
  { id: "turmeric", name: "Turmeric", unit: "kg",    pricePerUnit: 250, defaultQty: 1, aliases: ["turmeric","haldi","arishina"] },
  { id: "masala",   name: "Masala",   unit: "pack",  pricePerUnit: 60,  defaultQty: 1, aliases: ["masala","garam masala","spice mix"] },
  { id: "noodles",  name: "Noodles",  unit: "pack",  pricePerUnit: 15,  defaultQty: 1, aliases: ["noodles","maggi","ramen"] },
];

export const findSku = (token: string): Sku | undefined => {
  const t = token.toLowerCase().trim();
  return CATALOG.find((s) => s.aliases.some((a) => t === a || t.includes(a) || a.includes(t)));
};

export const skuById = (id: string) => CATALOG.find((s) => s.id === id);
