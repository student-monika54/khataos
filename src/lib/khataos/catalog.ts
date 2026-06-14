// Predefined SKU catalog for the guided voice-commerce agent.
// Closed set — the parser only matches against these SKUs.
// Each SKU has multilingual aliases (English, Hindi-Romanised, Kannada-Romanised)
// for deterministic matching from Twilio STT output.

export type Sku = {
  id: string;
  name: string;          // canonical display name
  unit: "kg" | "litre" | "pcs" | "pack";
  pricePerUnit: number;  // INR
  defaultQty: number;    // when user says "add X" with no quantity
  aliases: string[];     // lowercased, ASCII
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
