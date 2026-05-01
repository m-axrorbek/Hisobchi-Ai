import { isDebtRecord } from "./records.js";

export const findMatchingDebts = (records, paymentDraft) => {
  const directionType = paymentDraft.payment_direction === "incoming" ? "debt_given" : "debt_taken";
  const normalizedPerson = String(paymentDraft.person || "").trim().toLowerCase();

  return records
    .filter(
      (record) =>
        isDebtRecord(record) &&
        record.type === directionType &&
        !record.archived &&
        ["unpaid", "partial"].includes(record.payment_status) &&
        String(record.person || "").trim().toLowerCase() === normalizedPerson
    )
    .sort((left, right) => new Date(`${left.date}T${left.time}`) - new Date(`${right.date}T${right.time}`));
};

export const buildOverpaymentMessage = (debt, amount) => {
  const remaining = Number(debt.remaining_amount || 0);
  const extra = Math.max(Number(amount || 0) - remaining, 0);
  return `Qarz ${remaining.toLocaleString("uz-UZ")} edi, siz ${Number(amount || 0).toLocaleString(
    "uz-UZ"
  )} kiritdingiz. Qolgan ${extra.toLocaleString("uz-UZ")} ni nima qilamiz?`;
};

export const isFullPayment = (amount) => amount === "full";
