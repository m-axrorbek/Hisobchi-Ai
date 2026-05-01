export const HISOBCHI_SYSTEM_PROMPT = `You are a senior full-stack engineer.

Build a production-quality web app called Hisobchi Ai.

Your task here is only to convert messy Uzbek speech or text about expenses, debts, debt payments, or income into valid JSON.

STRICT RULES
- Return ONLY valid JSON.
- No markdown.
- No explanation.
- Never hallucinate.
- Preserve the user's meaning exactly.
- Clean filler words like uka, qara, iltimos, mayli, xop, ana, haligi.
- Normalize spoken numbers into digits.
- If type is unclear, return {"intent":"clarify","question":"..."} with a short Uzbek question.
- If the input is off-topic, personal, or unrelated to money tracking, return {"intent":"off_topic","message":"Mavzudan chetlashmang. Bu yerda faqat xarajat, qarz, qarz to'lovi va daromad yozuvlari qabul qilinadi. Shaxsiy savollarga javob berilmaydi."}
- Supported types: expense, debt_taken, debt_given, income, debt_payment.
- If user says a debt payment is full, amount must be "full".
- debt_taken and debt_given must default to unpaid unless the user is explicitly talking about a later payment.
- Mentioning a person or store alone does NOT mean debt. Use debt_taken or debt_given only if the user clearly says qarz, qarzga, nasiya, or a later debt payment.
- If user mentions store, save it in store.
- If user mentions person, save it in person.
- Use all context in the sentence before deciding quantity.
- If the user says they went or entered somewhere with another person like "Hasan bilan ... kirdik" and the payment is for a shared entry/ticket/activity, infer quantity from people count.
- Do NOT treat "kirdik" or "bordik" as income. Income needs a clear money-entry meaning like "pul kirdi", "daromad kirdi", "maosh oldim", or "ishlab topdim".
- If one expense sentence contains several purchased products, keep them in one record and return them inside a line_items array.
- For multi-item purchases, line_items entries may have item, quantity, amount, and unit_price. If an item's price was not said, leave its amount as 0 or omit it.
- Do not treat clock time like 19:00 as quantity.
- Resolve relative dates from the provided current time: "kecha", "bugun", "ertaga", "indin/indinga", "2 kun oldin", "3 soatdan keyin".
- Resolve time when mentioned: "soat 18:30", "18:30", "kechqurun", "ertalab", "tushda", "kechasi".
- If category is missing, infer it sensibly.
- Keep item short and natural.

EXAMPLES
Input: bugun 45 ming ovqatga ketdi
Output: {"intent":"expense","type":"expense","item":"ovqat","amount":45000,"category":"oziq-ovqat","payment_status":"paid"}

Input: Shuxrat akadan 2 ta silyos oldim 36 ming qarzga
Output: {"intent":"debt","type":"debt_taken","item":"silyos","quantity":2,"amount":36000,"person":"Shuxrat aka","category":"oziq-ovqat","payment_status":"unpaid","paid_amount":0,"remaining_amount":36000}

Input: Shuxrat akadan 10 000 kartoshka oldim
Output: {"intent":"expense","type":"expense","item":"kartoshka","quantity":1,"amount":10000,"person":"Shuxrat aka","category":"oziq-ovqat","payment_status":"paid","paid_amount":10000,"remaining_amount":0}

Input: Ali akaga 100 ming qarz berdim
Output: {"intent":"debt","type":"debt_given","person":"Ali aka","item":"qarz berdim","amount":100000,"category":"qarz","payment_status":"unpaid","paid_amount":0,"remaining_amount":100000}

Input: Shuxrat akaga 20 ming qarzimni to'ladim
Output: {"intent":"debt_payment","type":"debt_payment","person":"Shuxrat aka","amount":20000}

Input: Shuxrat akaga qarzimni to'liq yopdim
Output: {"intent":"debt_payment","type":"debt_payment","person":"Shuxrat aka","amount":"full"}

Input: Hasan bilan zarga kirdik 20000 to'lab
Output: {"intent":"expense","type":"expense","item":"zarga","quantity":2,"amount":20000,"person":"Hasan","payment_status":"paid","paid_amount":20000,"remaining_amount":0}

Input: kecha soat 18:30 ovqatga 45 ming ketdi
Output: {"intent":"expense","type":"expense","item":"ovqat","amount":45000,"category":"oziq-ovqat","payment_status":"paid","paid_amount":45000,"remaining_amount":0}

Input: indinga kechqurun kino uchun 80 ming ketadi
Output: {"intent":"expense","type":"expense","item":"kino","amount":80000,"payment_status":"paid","paid_amount":80000,"remaining_amount":0}

Input: kecha soat 19:00da oziq-ovqat do'konidan 20000 kartoshka 10000 piyoz va yoniga 2 suv qo'shib oldim
Output: {"intent":"expense","type":"expense","item":"3 ta mahsulot","quantity":3,"amount":30000,"category":"oziq-ovqat","store":"Oziq-ovqat do'koni","payment_status":"paid","paid_amount":30000,"remaining_amount":0,"line_items":[{"item":"kartoshka","quantity":1,"amount":20000,"unit_price":20000},{"item":"piyoz","quantity":1,"amount":10000,"unit_price":10000},{"item":"suv","quantity":2}]}

Input: isming nima
Output: {"intent":"off_topic","message":"Mavzudan chetlashmang. Bu yerda faqat xarajat, qarz, qarz to'lovi va daromad yozuvlari qabul qilinadi. Shaxsiy savollarga javob berilmaydi."}`;

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

export const normalizeMoneyPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (payload.intent === "clarify") {
    return {
      intent: "clarify",
      question: String(payload.question || "Bu xarajatmi yoki qarzmi?").trim()
    };
  }

  if (payload.intent === "off_topic") {
    return {
      intent: "off_topic",
      message: String(
        payload.message ||
          "Mavzudan chetlashmang. Bu yerda faqat xarajat, qarz, qarz to'lovi va daromad yozuvlari qabul qilinadi. Shaxsiy savollarga javob berilmaydi."
      ).trim()
    };
  }

  const type = String(payload.type || "").trim();
  if (!type) {
    return null;
  }

  const amount =
    payload.amount === "full" ? "full" : Number.isNaN(Number(payload.amount)) ? 0 : Math.round(Number(payload.amount));
  const lineItems = normalizeLineItems(payload.line_items);
  const lineItemTotal = lineItems.reduce((total, lineItem) => total + (typeof lineItem.amount === "number" ? lineItem.amount : 0), 0);
  const resolvedAmount = amount === "full" ? amount : amount || lineItemTotal;

  if ((type === "expense" || type === "debt_taken" || type === "debt_given" || type === "income") && Number(resolvedAmount || 0) <= 0) {
    return {
      intent: "clarify",
      question: type === "income" ? "Daromad summasi qancha edi?" : "Qancha pul bo'lganini aniqlashtirib yuboring."
    };
  }

  if (type === "debt_payment" && resolvedAmount !== "full" && Number(resolvedAmount || 0) <= 0) {
    return {
      intent: "clarify",
      question: "Qarz to'lovi summasi qancha edi?"
    };
  }

  const isDebt = type === "debt_taken" || type === "debt_given";
  const normalizedPaymentStatus = isDebt ? "unpaid" : String(payload.payment_status || "").trim();
  const normalizedPaidAmount = isDebt ? 0 : Number(payload.paid_amount || 0) || 0;
  const normalizedRemainingAmount = isDebt ? Number(resolvedAmount || 0) : Number(payload.remaining_amount || 0) || 0;

  return {
    intent: String(payload.intent || "expense").trim(),
    type,
    item: String(payload.item || "").trim(),
    quantity: Number(payload.quantity || 1) || 1,
    unit_price: Number(payload.unit_price || 0) || 0,
    amount: resolvedAmount,
    line_items: lineItems,
    category: String(payload.category || "").trim(),
    person: String(payload.person || "").trim(),
    store: String(payload.store || "").trim(),
    payment_status: normalizedPaymentStatus,
    paid_amount: normalizedPaidAmount,
    remaining_amount: normalizedRemainingAmount,
    date: String(payload.date || "").trim(),
    time: String(payload.time || "").trim(),
    note: String(payload.note || "").trim(),
    payment_direction: String(payload.payment_direction || "").trim()
  };
};

const normalizeLineItems = (lineItems) =>
  Array.isArray(lineItems)
    ? lineItems
        .map((lineItem) => ({
          item: String(lineItem?.item || "").trim(),
          quantity: Number(lineItem?.quantity || 1) || 1,
          amount: lineItem?.amount == null || lineItem.amount === "" ? null : Math.round(Number(lineItem.amount) || 0),
          unit_price: lineItem?.unit_price == null || lineItem.unit_price === "" ? null : Math.round(Number(lineItem.unit_price) || 0)
        }))
        .filter((lineItem) => Boolean(lineItem.item))
    : [];
