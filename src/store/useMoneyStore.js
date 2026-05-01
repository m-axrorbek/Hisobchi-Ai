import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  cloneWithDerivedDebtState,
  createDebtPaymentRecord,
  createMoneyRecord,
  isDebtRecord,
  sortRecordsByDateDesc
} from "../lib/money/records.js";

export const useMoneyStore = create()(
  persist(
    (set, get) => ({
      records: [],
      composer: {
        open: false,
        mode: "create",
        draft: null
      },
      pendingResolution: null,

      openComposer: (draft = null, mode = "create") =>
        set({
          composer: {
            open: true,
            mode,
            draft
          }
        }),

      closeComposer: () =>
        set({
          composer: {
            open: false,
            mode: "create",
            draft: null
          }
        }),

      setPendingResolution: (pendingResolution) => set({ pendingResolution }),
      clearPendingResolution: () => set({ pendingResolution: null }),

      saveRecord: (input, options = {}) =>
        set((state) => {
          const nextRecord = createMoneyRecord(input, options);
          const exists = state.records.some((record) => record.id === nextRecord.id);
          const nextRecords = exists
            ? state.records.map((record) => (record.id === nextRecord.id ? nextRecord : record))
            : [nextRecord, ...state.records];

          return {
            records: sortRecordsByDateDesc(nextRecords),
            composer: {
              open: false,
              mode: "create",
              draft: null
            }
          };
        }),

      archiveRecord: (id) =>
        set((state) => ({
          records: state.records.map((record) =>
            record.id === id ? { ...record, archived: true, updated_at: new Date().toISOString() } : record
          )
        })),

      restoreRecord: (id) =>
        set((state) => ({
          records: state.records.map((record) =>
            record.id === id ? { ...record, archived: false, updated_at: new Date().toISOString() } : record
          )
        })),

      deleteRecord: (id) =>
        set((state) => ({
          records: state.records.filter((record) => record.id !== id)
        })),

      markDebtPaid: (debtId, meta = {}) => {
        get().applyDebtPayment({
          debtId,
          amount: "full",
          note: meta.note || "To'liq yopildi",
          sourceText: meta.sourceText || ""
        });
      },

      applyDebtPayment: ({ debtId, amount, note = "", sourceText = "", direction = "" }) =>
        set((state) => {
          const target = state.records.find((record) => record.id === debtId);
          if (!target || !isDebtRecord(target)) {
            return state;
          }

          const remaining = Number(target.remaining_amount || 0);
          const paymentAmount = amount === "full" ? remaining : Math.max(Number(amount || 0), 0);
          if (paymentAmount <= 0) {
            return state;
          }

          const paymentDirection = direction || (target.type === "debt_given" ? "incoming" : "outgoing");
          const nextPaidAmount = Math.min(Number(target.paid_amount || 0) + paymentAmount, Number(target.amount || 0));
          const updatedDebt = cloneWithDerivedDebtState(target, {
            paid_amount: nextPaidAmount,
            remaining_amount: Math.max(Number(target.amount || 0) - nextPaidAmount, 0)
          });

          const paymentRecord = createDebtPaymentRecord({
            amount: paymentAmount,
            person: target.person,
            note: note || `${target.person || "Qarz"} uchun to'lov`,
            debtId,
            direction: paymentDirection,
            sourceText
          });

          return {
            records: sortRecordsByDateDesc(
              state.records.map((record) => (record.id === debtId ? updatedDebt : record)).concat(paymentRecord)
            ),
            pendingResolution: null
          };
        })
    }),
    {
      name: "puldaftar-records",
      version: 1,
      partialize: (state) => ({
        records: state.records
      })
    }
  )
);
