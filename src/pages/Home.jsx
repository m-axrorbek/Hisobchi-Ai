import { useState } from "react";
import { PencilLine } from "lucide-react";
import VoiceInput from "../components/VoiceInput";
import ManualRecordSheet from "../components/ManualRecordSheet";
import DebtResolutionSheet from "../components/DebtResolutionSheet";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { cleanUzbekInput } from "../lib/cleaner";
import { buildOverpaymentMessage, findMatchingDebts, isFullPayment } from "../lib/money/debts.js";
import { resolveMoneyDrafts } from "../lib/money/resolve.js";
import { useMoneyStore } from "../store/useMoneyStore";

const Home = () => {
  const DEFAULT_OFF_TOPIC_MESSAGE =
    "Mavzudan chetlashmang. Bu yerda faqat xarajat, qarz, qarz to'lovi va daromad yozuvlari qabul qilinadi. Shaxsiy savollarga javob berilmaydi.";

  const records = useMoneyStore((state) => state.records);
  const openComposer = useMoneyStore((state) => state.openComposer);
  const saveRecord = useMoneyStore((state) => state.saveRecord);
  const applyDebtPayment = useMoneyStore((state) => state.applyDebtPayment);
  const pendingResolution = useMoneyStore((state) => state.pendingResolution);
  const setPendingResolution = useMoneyStore((state) => state.setPendingResolution);
  const clearPendingResolution = useMoneyStore((state) => state.clearPendingResolution);

  const [input, setInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [clarificationState, setClarificationState] = useState(null);

  const handleVoiceSend = async (text) => {
    const cleaned = cleanUzbekInput(text);
    if (!cleaned) {
      return {
        outcome: "idle"
      };
    }

    setIsParsing(true);
    setFeedback(null);

    try {
      const sourceText = clarificationState ? combineClarificationText(clarificationState.sourceText, cleaned) : cleaned;
      const drafts = await resolveMoneyDrafts(sourceText);
      if (!drafts.length) {
        setFeedback({
          tone: "warning",
          text: "Gapdan yozuv chiqarmadik. Matnni biroz aniqroq yuborib ko'ring."
        });
        return {
          outcome: "warning",
          keepEditor: true,
          nextValue: cleaned,
          statusText: "Matnni aniqlashtirib qayta yuboring."
        };
      }

      for (const draft of drafts) {
        const handled = await handleDraft(draft, sourceText);
        if (handled?.outcome !== "saved") {
          return handled;
        }
      }

      return {
        outcome: "saved",
        clearInput: true,
        statusText: "Yozuv saqlandi."
      };
    } catch (_error) {
      setFeedback({
        tone: "warning",
        text: "Internet bo'lmasa ham qo'lda yozuv qo'shishingiz mumkin."
      });
      return {
        outcome: "warning",
        keepEditor: true,
        nextValue: cleaned,
        statusText: "Internet bo'lmasa, matnni to'g'rilab qayta yuboring."
      };
    } finally {
      setIsParsing(false);
    }
  };

  const handleDraft = async (draft, sourceText) => {
    if (draft.intent === "off_topic") {
      setClarificationState(null);
      setFeedback({
        tone: "warning",
        text: draft.message || DEFAULT_OFF_TOPIC_MESSAGE
      });
      setInput("");
      return {
        outcome: "halt",
        clearInput: true
      };
    }

    if (draft.intent === "clarify") {
      setClarificationState({
        sourceText,
        question: draft.question
      });
      setFeedback({
        tone: "warning",
        text: draft.question
      });
      setInput("");
      return {
        outcome: "clarify",
        keepEditor: true,
        nextValue: "",
        statusText: "Javobni yozing, men oldingi gap bilan birga tushunaman."
      };
    }

    if (draft.type === "debt_payment") {
      const matches = findMatchingDebts(records, draft);

      if (!matches.length) {
        setClarificationState(null);
        setFeedback({
          tone: "warning",
          text: "Mos faol qarz topilmadi. Avval qarzni yozuvga qo'shing yoki odam nomini tekshiring."
        });
        setInput(sourceText);
        return {
          outcome: "warning",
          keepEditor: true,
          nextValue: sourceText,
          statusText: "Matnni to'g'rilab qayta yuboring."
        };
      }

      if (matches.length > 1) {
        setClarificationState(null);
        setPendingResolution({
          mode: "select_debt",
          title: "Qaysi qarzni yopamiz?",
          message: "Bir odam uchun bir nechta faol qarz bor. Eng eski qarz yuqorida ko'rsatilgan.",
          candidates: matches,
          draft,
          sourceText
        });
        return {
          outcome: "halt",
          clearInput: true
        };
      }

      return applyPaymentToDebt(matches[0], draft, sourceText);
    }

    setClarificationState(null);
    saveRecord({
      ...draft,
      source_text: sourceText
    });
    setInput("");
    setFeedback({
      tone: "success",
      text: "Yozuv saqlandi."
    });
    return {
      outcome: "saved",
      clearInput: true,
      statusText: "Yozuv saqlandi."
    };
  };

  const applyPaymentToDebt = (debt, draft, sourceText, forceFull = false) => {
    const amount = forceFull ? "full" : draft.amount;

    if (!isFullPayment(amount) && Number(amount) > Number(debt.remaining_amount || 0)) {
      setPendingResolution({
        mode: "overpayment",
        title: "Ortiqcha to'lov",
        message: buildOverpaymentMessage(debt, amount),
        debt,
        draft,
        sourceText
      });
      return {
        outcome: "halt",
        clearInput: true
      };
    }

    applyDebtPayment({
      debtId: debt.id,
      amount,
      sourceText,
      direction: draft.payment_direction,
      note: draft.note
    });
    setClarificationState(null);
    clearPendingResolution();
    setInput("");
    setFeedback({
      tone: "success",
      text: "Qarz to'lovi saqlandi."
    });
    return {
      outcome: "saved",
      clearInput: true,
      statusText: "Qarz to'lovi saqlandi."
    };
  };

  const handleClearInput = () => {
    setClarificationState(null);
    setFeedback(null);
    setInput("");
  };

  return (
    <div className="grid gap-6 pt-24 sm:pt-28">
      <Card className="overflow-hidden border-0 bg-gradient-to-b from-ink-50 to-white shadow-soft dark:from-ink-900 dark:to-ink-950">
        <CardContent className="space-y-8 px-5 py-10 sm:px-7">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500 dark:text-ink-300">
              HISOBCHI AI
            </p>
            <h1 className="section-title text-2xl font-semibold text-ink-950 dark:text-ink-50">
              Gapiring, xarajat va qarzlar yozuvga tushadi
            </h1>
          </div>

          <div className="flex justify-center">
            <VoiceInput
              value={input}
              onChange={setInput}
              onSendText={handleVoiceSend}
              onClearInput={handleClearInput}
              variant="dock"
              micLabel="Ovoz orqali qo'shish"
              forceEditor={Boolean(clarificationState)}
              editorPlaceholder={
                clarificationState
                  ? "Savolga javobni shu yerga yozing. Men uni oldingi gap bilan birga tushunaman."
                  : undefined
              }
              sideAction={
                <div className="group relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-16 w-16 rounded-full p-0"
                    onClick={() => openComposer()}
                    aria-label="Yozuv orqali qo'shish"
                    aria-haspopup="dialog"
                  >
                    <PencilLine className="h-5 w-5" />
                  </Button>
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-900 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-ink-100 dark:text-ink-900">
                    Yozuv orqali qo'shish
                  </span>
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>

      {feedback ? (
        <Card className={feedback.tone === "warning" ? "border-ink-300 dark:border-ink-700" : ""}>
          <CardContent
            className="py-4 text-sm text-ink-700 dark:text-ink-200"
            role={feedback.tone === "warning" ? "alert" : "status"}
            aria-live={feedback.tone === "warning" ? "assertive" : "polite"}
          >
            {feedback.text}
          </CardContent>
        </Card>
      ) : null}

      {isParsing ? <p className="text-xs text-ink-500 dark:text-ink-400" role="status" aria-live="polite">AI yozuvni tahlil qilmoqda...</p> : null}

      <ManualRecordSheet />
      <DebtResolutionSheet
        resolution={pendingResolution}
        onClose={clearPendingResolution}
        onSelectDebt={(debt) => applyPaymentToDebt(debt, pendingResolution.draft, pendingResolution.sourceText)}
        onConfirmFull={(debt, draft) => applyPaymentToDebt(debt, draft, pendingResolution.sourceText, true)}
        onConfirmPartial={(debt, amount) => {
          if (amount > Number(debt.remaining_amount || 0)) {
            setPendingResolution({
              mode: "overpayment",
              title: "Ortiqcha to'lov",
              message: buildOverpaymentMessage(debt, amount),
              debt,
              draft: { amount, payment_direction: "outgoing", note: "Qisman to'lov" },
              sourceText: "Qo'lda kiritilgan to'lov"
            });
            return;
          }

          applyDebtPayment({
            debtId: debt.id,
            amount,
            note: "Qisman to'lov",
            sourceText: "Qo'lda kiritilgan to'lov"
          });
          clearPendingResolution();
        }}
      />
    </div>
  );
};

export default Home;

const combineClarificationText = (sourceText, answerText) => {
  const base = String(sourceText || "").trim();
  const answer = String(answerText || "").trim();
  if (!base) {
    return answer;
  }
  if (!answer) {
    return base;
  }

  return `${base}. ${answer}`;
};
