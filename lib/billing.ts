// Billing catalog + math. Prices are in PAISE (bigint-safe integers) — never
// floats — so a bill never drifts by a rounding paise. Presets are editable per
// bill (the owner's chosen pricing model).

export type ServiceItem = { id: string; name: string; defaultPaise: number };
export type BillLine = { id: string; name: string; pricePaise: number; qty: number };

export const SERVICE_CATALOG: { group: string; items: ServiceItem[] }[] = [
  { group: "Haircut & beard", items: [
    { id: "haircut",      name: "Haircut",        defaultPaise: 15000 },
    { id: "beard-trim",   name: "Beard trim",     defaultPaise: 8000 },
    { id: "shave",        name: "Shave",          defaultPaise: 10000 },
    { id: "kids-haircut", name: "Kids haircut",   defaultPaise: 12000 },
  ]},
  { group: "Colour & treatments", items: [
    { id: "hair-colour",  name: "Hair colour",    defaultPaise: 80000 },
    { id: "d-tan",        name: "D-Tan",          defaultPaise: 40000 },
    { id: "keratin",      name: "Keratin",        defaultPaise: 250000 },
    { id: "hair-spa",     name: "Hair spa",       defaultPaise: 60000 },
  ]},
  { group: "Wash, massage & styling", items: [
    { id: "wash",         name: "Shampoo & wash", defaultPaise: 10000 },
    { id: "head-massage", name: "Head massage",   defaultPaise: 20000 },
    { id: "blow-dry",     name: "Blow-dry / styling", defaultPaise: 25000 },
  ]},
  { group: "Facial, threading & waxing", items: [
    { id: "facial",       name: "Facial",         defaultPaise: 50000 },
    { id: "threading",    name: "Threading",      defaultPaise: 5000 },
    { id: "waxing",       name: "Waxing",         defaultPaise: 30000 },
  ]},
];

export const PAYMENT_METHODS = ["Cash", "UPI", "Card"] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const DEFAULT_GST_PERCENT = 18;

export type BillTotals = {
  subtotalPaise: number;
  discountPaise: number;
  gstPercent: number;
  gstPaise: number;
  totalPaise: number;
};

/** GST is charged on the post-discount amount, the standard order in India. */
export function computeBill(lines: BillLine[], discountPaise: number, gstPercent: number): BillTotals {
  const subtotal = lines.reduce((s, l) => s + l.pricePaise * l.qty, 0);
  const afterDiscount = Math.max(0, subtotal - Math.max(0, discountPaise));
  const gst = Math.round((afterDiscount * gstPercent) / 100);
  return {
    subtotalPaise: subtotal,
    discountPaise: Math.min(discountPaise, subtotal),
    gstPercent,
    gstPaise: gst,
    totalPaise: afterDiscount + gst,
  };
}

export const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const parseRupeesToPaise = (v: string) => Math.round((parseFloat(v) || 0) * 100);
