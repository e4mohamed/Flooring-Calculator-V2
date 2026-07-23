/* =======================================================================
   defaults.js — القيم الافتراضية + دوال البيانات المشتركة
   =======================================================================
   يُستخدم من:
     - products.html   (كشف المنتجات والأسعار — صفحة الأدمن للتعديل)
     - index.html       (حاسبة الكميات والتكلفة — صفحة المستخدم)

   البيانات الحيّة (الأسعار الفعلية) مصدرها قاعدة بيانات Firestore
   (انظر firebase-config.js)، وهذا الملف يوفّر فقط:
     1) نسخة افتراضية (Seed) تُستخدم أول مرة لتعبئة قاعدة البيانات،
        وكـ "قيمة احتياطية" تظهر فورًا قبل وصول البيانات الحيّة.
     2) الدوال المساعدة (getPrice, getCoverage, ...) التي تعمل على
        المصفوفات الحيّة الحالية أيًا كان مصدرها.
   ======================================================================= */

const SEED_RAW_PRODUCTS = [
  {key:"SB55099", name:"Stafloor Sealer SB-55099", cat:"سيلر (Sealer)", price:300, coverage:5},
  {key:"SF10106", name:"Stafloor Sealer SF-10106", cat:"سيلر (Sealer)", price:420, coverage:5},
  {key:"COAT10151", name:"Stafloor Coat-10151", cat:"طبقة نهائية (Topcoat)", price:320, coverage:6},
  {key:"NOVOLAC10160", name:"Stafloor Novolac-10160", cat:"طبقة نهائية نوفولاك", price:380, coverage:5},
  {key:"PU60125", name:"Stafloor PU-60125", cat:"طبقة نهائية PU", price:300, coverage:5},
  {key:"SL2MM", name:"Stafloor SL-10150 - 2mm", cat:"ذاتي التسوية", price:175, coverage:8},
  {key:"SL3MM", name:"Stafloor SL-10150 - 3mm", cat:"ذاتي التسوية", price:175, coverage:7},
];

const SEED_AUX_MATERIALS = [
  {key:"TALC", name:"Talc", price:16},
  {key:"AGG0103", name:"Aggregate 01/03", price:3},
  {key:"AGG0816", name:"Aggregate 0.8/1.6", price:3},
];

const SEED_MIXTURES = [
  {key:"MIX10106", name:"Mixture Putty 10106", cat:"خلطة معجون", coverage:4,
   composition:[{key:"SF10106", ratio:1}, {key:"TALC", ratio:2}]},
  {key:"MIX10151", name:"Mixture Putty 10151", cat:"خلطة معجون", coverage:4,
   composition:[{key:"COAT10151", ratio:1}, {key:"TALC", ratio:2}]},
  {key:"MORTER10151", name:"Morter Putty 10151 (Heavy)", cat:"خلطة مونة", coverage:1,
   composition:[{key:"SF10106", ratio:1}, {key:"AGG0816", ratio:15}]},
];

// deep-clone helper (avoid mutating the SEED_* constants)
function clone(x){ return JSON.parse(JSON.stringify(x)); }

// snapshot usable for "seed database" / "restore factory defaults" actions
export const DEFAULT_DATA = {
  rawProducts: clone(SEED_RAW_PRODUCTS),
  auxMaterials: clone(SEED_AUX_MATERIALS),
  mixtures: clone(SEED_MIXTURES),
};

// live, mutable arrays — start out as the defaults, get overwritten in-place
// once real data arrives from Firestore (see applyProductsData below)
export let rawProducts = clone(SEED_RAW_PRODUCTS);
export let auxMaterials = clone(SEED_AUX_MATERIALS);
export let mixtures = clone(SEED_MIXTURES);

// overwrite the live arrays' *contents* in place (keeps references stable
// so anything that imported rawProducts/auxMaterials/mixtures sees the update)
export function applyProductsData(data){
  rawProducts.length = 0;
  (data?.rawProducts || []).forEach(p=>rawProducts.push(p));
  auxMaterials.length = 0;
  (data?.auxMaterials || []).forEach(a=>auxMaterials.push(a));
  mixtures.length = 0;
  (data?.mixtures || []).forEach(m=>mixtures.push(m));
}

// ---------------------------------------------------------------------
// Helpers (operate on whatever is currently in the live arrays)
// ---------------------------------------------------------------------
export function computeMixPrice(mix){
  let totalParts=0, weightedSum=0;
  mix.composition.forEach(c=>{
    const p = getPrice(c.key);
    totalParts += c.ratio;
    weightedSum += p*c.ratio;
  });
  return totalParts ? weightedSum/totalParts : 0;
}

export function getPrice(key){
  const raw = rawProducts.find(p=>p.key===key);
  if(raw) return raw.price;
  const aux = auxMaterials.find(p=>p.key===key);
  if(aux) return aux.price;
  const mix = mixtures.find(p=>p.key===key);
  if(mix) return computeMixPrice(mix);
  return 0;
}
export function getCoverage(key){
  const raw = rawProducts.find(p=>p.key===key);
  if(raw) return raw.coverage;
  const mix = mixtures.find(p=>p.key===key);
  if(mix) return mix.coverage;
  return 0;
}
export function getName(key){
  const all = [...rawProducts, ...mixtures, ...auxMaterials];
  const f = all.find(p=>p.key===key);
  return f ? f.name : key;
}

// selectable items in the quotation page = rawProducts + mixtures (aux excluded)
// (a function, not a static array, so it always reflects the current live data)
export function getSelectableItems(){
  return [...rawProducts, ...mixtures];
}
