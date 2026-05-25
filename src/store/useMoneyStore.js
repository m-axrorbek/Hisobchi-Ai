import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  cloneWithDerivedDebtState,
  createDebtPaymentRecord,
  createMoneyRecord,
  isDebtRecord,
  sortRecordsByDateDesc
} from "../lib/money/records.js";
import { useAuthStore } from "./useAuthStore";

const LEGACY_USER_KEY = "__legacy__";

export const useMoneyStore = create()(
  persist(
    (set, get) => ({
      records: [],
      recordsByUser: {},
      composer: {
        open: false,
        mode: "create",
        draft: null
      },
      pendingResolution: null,

      syncRecordsForUser: (userId) =>
        set((state) => {
          if (!userId) {
            return {
              records: [],
              composer: buildComposerState(),
              pendingResolution: null
            };
          }

          const hasExplicitUserRecords = Array.isArray(state.recordsByUser[userId]);
          const legacyRecords = Array.isArray(state.recordsByUser[LEGACY_USER_KEY]) ? state.recordsByUser[LEGACY_USER_KEY] : [];
          const shouldClaimLegacyRecords = !hasExplicitUserRecords && legacyRecords.length > 0;
          const nextRecordsByUser = shouldClaimLegacyRecords
            ? {
                ...state.recordsByUser,
                [userId]: legacyRecords,
                [LEGACY_USER_KEY]: []
              }
            : state.recordsByUser;

          return {
            records: getUserRecords(nextRecordsByUser, userId),
            recordsByUser: nextRecordsByUser,
            composer: buildComposerState(),
            pendingResolution: null
          };
        }),

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
          composer: buildComposerState()
        }),

      setPendingResolution: (pendingResolution) => set({ pendingResolution }),
      clearPendingResolution: () => set({ pendingResolution: null }),

      saveRecord: (input, options = {}) =>
        set((state) => {
          const userId = getActiveUserId();
          if (!userId) {
            return state;
          }

          const currentRecords = getUserRecords(state.recordsByUser, userId);
          const nextRecord = createMoneyRecord(input, options);
          const exists = currentRecords.some((record) => record.id === nextRecord.id);
          const nextRecords = exists
            ? currentRecords.map((record) => (record.id === nextRecord.id ? nextRecord : record))
            : [nextRecord, ...currentRecords];

          return buildUserRecordsState(state, userId, nextRecords, {
            composer: buildComposerState()
          });
        }),

      archiveRecord: (id) =>
        set((state) => {
          const userId = getActiveUserId();
          if (!userId) {
            return state;
          }

          return buildUserRecordsState(
            state,
            userId,
            getUserRecords(state.recordsByUser, userId).map((record) =>
              record.id === id ? { ...record, archived: true, updated_at: new Date().toISOString() } : record
            )
          );
        }),

      restoreRecord: (id) =>
        set((state) => {
          const userId = getActiveUserId();
          if (!userId) {
            return state;
          }

          return buildUserRecordsState(
            state,
            userId,
            getUserRecords(state.recordsByUser, userId).map((record) =>
              record.id === id ? { ...record, archived: false, updated_at: new Date().toISOString() } : record
            )
          );
        }),

      deleteRecord: (id) =>
        set((state) => {
          const userId = getActiveUserId();
          if (!userId) {
            return state;
          }

          return buildUserRecordsState(
            state,
            userId,
            getUserRecords(state.recordsByUser, userId).filter((record) => record.id !== id)
          );
        }),

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
          const userId = getActiveUserId();
          if (!userId) {
            return state;
          }

          const currentRecords = getUserRecords(state.recordsByUser, userId);
          const target = currentRecords.find((record) => record.id === debtId);
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

          return buildUserRecordsState(
            state,
            userId,
            currentRecords.map((record) => (record.id === debtId ? updatedDebt : record)).concat(paymentRecord),
            {
              pendingResolution: null
            }
          );
        })
    }),
    {
      name: "puldaftar-records",
      version: 2,
      partialize: (state) => ({
        recordsByUser: state.recordsByUser
      }),
      migrate: (persistedState, version) => {
        if (version < 2) {
          const legacyRecords = Array.isArray(persistedState?.records) ? persistedState.records : [];
          return {
            records: [],
            recordsByUser: legacyRecords.length
              ? {
                  [LEGACY_USER_KEY]: legacyRecords
                }
              : {}
          };
        }

        return {
          records: [],
          recordsByUser: persistedState?.recordsByUser || {}
        };
      }
    }
  )
);

const buildComposerState = () => ({
  open: false,
  mode: "create",
  draft: null
});

const getActiveUserId = () => useAuthStore.getState().currentUser?.id || "";

const getUserRecords = (recordsByUser, userId) => sortRecordsByDateDesc(recordsByUser?.[userId] || []);

const buildUserRecordsState = (state, userId, nextRecords, extraState = {}) => {
  const sortedRecords = sortRecordsByDateDesc(nextRecords);
  return {
    ...extraState,
    records: sortedRecords,
    recordsByUser: {
      ...state.recordsByUser,
      [userId]: sortedRecords
    }
  };
};
