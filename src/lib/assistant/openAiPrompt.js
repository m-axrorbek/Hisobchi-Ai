import { normalizeAssistantPayload } from "./schema.js";

export const HISOBCHI_SYSTEM_PROMPT = `Create only the JSON data structure and parser output schema for Hisobchi AI.

Do not build UI.
Do not build full project.
Do not add extra features.
Focus only on clean JSON structures.

The app is an Uzbek voice-based expense, income, and debt tracker.

The parser must convert Uzbek speech/text into structured JSON.

Required output schema:

{
  "intent": "expense | income | debt_taken | debt_given | debt_payment | mixed | unknown",
  "needs_confirmation": false,
  "question": null,
  "records": [
    {
      "id": "string",
      "type": "expense | income | debt_taken | debt_given | debt_payment",
      "item": "string | null",
      "quantity": "number | null",
      "unit": "kg | gramm | litr | ml | dona | paket | quti | butilka | banka | bog'lam | dasta | other | null",
      "unit_price": "number | null",
      "amount": "number | 'full' for full debt payment",
      "category": "string",
      "person": "string | null",
      "store": "string | null",
      "currency": "UZS",
      "payment_status": "paid | unpaid | partial",
      "paid_amount": "number",
      "remaining_amount": "number",
      "date": "YYYY-MM-DD",
      "time": "HH:mm",
      "note": "string | null",
      "archived": false,
      "created_at": "ISO string",
      "updated_at": "ISO string"
    }
  ]
}

Rules:
1. One spoken sentence may create multiple records.
Example:
"bugun soat 16:00 da Baraka do'konidan 10000 kartoshka 7000 semichka 3 dona tuxum 7000"
Return 3 separate expense records.

2. Normalize numbers:
- 10 ming -> 10000
- 36 ming -> 36000
- 8 million -> 8000000
- o'n ikki -> 12
- on nikki -> 12
- toqiz -> 9
- yigirma uch -> 23

3. Normalize units:
- kg, kilo, kilogram -> kg
- gramm, g -> gramm
- litr, l -> litr
- ml, millilitr -> ml
- dona, ta -> dona
- paket, pachka -> paket
- quti, karobka -> quti
- butilka -> butilka
- banka -> banka
- bog'lam -> bog'lam
- dasta -> dasta

4. Detect record types:
- Expense: oldim, xarid qildim, ketdi -> type: "expense"
- Income: pul tushdi, pul keldi, pul tushirdim -> type: "income"
- Debt taken: qarz oldim, nasiya oldim, qarzga oldim -> type: "debt_taken"
- Debt given: qarz berdim -> type: "debt_given"
- Debt payment: qarzimni to'ladim, qarzni yopdim, qaytardim -> type: "debt_payment"

5. Debt rules:
- For debt_taken and debt_given:
  payment_status = "unpaid"
  paid_amount = 0
  remaining_amount = amount
- For expense and income:
  payment_status = "paid"
  paid_amount = amount
  remaining_amount = 0
- For debt_payment:
  partial payment -> note: "partial debt payment"
  full payment -> amount: "full", note: "full debt payment"

6. Person/store rules:
- "Baraka do'konidan" -> store: "Baraka do'koni"
- "Shuxrat akadan" -> person: "Shuxrat aka"
- "Ali akaga" -> person: "Ali aka"

7. Category inference:
- non, sut, kartoshka, piyoz, tuxum, ovqat, silyos -> oziq-ovqat
- suv, cola, sharbat -> ichimlik
- taksi, benzin -> transport
- kiyim, oyoq kiyim -> kiyim
- dori -> sog'liq
- qarz -> qarz
- unknown -> boshqa

8. If input is unclear, return:
{
  "intent": "unknown",
  "needs_confirmation": true,
  "question": "Qisqa o'zbekcha aniqlashtiruvchi savol",
  "records": []
}

9. Return ONLY valid JSON.
No explanation.
No markdown.
No comments.`;

export const buildMoneyAssistantMessages = (text, nowIso = new Date().toISOString()) => [
  {
    role: "system",
    content: HISOBCHI_SYSTEM_PROMPT
  },
  {
    role: "user",
    content: `Current time: ${nowIso}\nUser input: ${text}`
  }
];

export const sanitizeJsonText = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
};

export const normalizeMoneyPayload = (payload, options = {}) => normalizeAssistantPayload(payload, options);
