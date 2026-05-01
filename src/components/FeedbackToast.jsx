import { AlertCircle, CheckCircle2 } from "lucide-react";

const FeedbackToast = ({ feedback }) => {
  if (!feedback?.text) {
    return null;
  }

  const isWarning = feedback.tone === "warning";
  const Icon = isWarning ? AlertCircle : CheckCircle2;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[80] flex justify-center px-4 sm:top-28">
      <div
        className={`pointer-events-auto w-full max-w-md rounded-2xl border bg-white/95 px-4 py-3 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur dark:bg-ink-900/95 ${
          isWarning
            ? "border-amber-200 text-amber-950 dark:border-amber-500/40 dark:text-amber-100"
            : "border-emerald-200 text-emerald-950 dark:border-emerald-500/40 dark:text-emerald-100"
        }`}
        role={isWarning ? "alert" : "status"}
        aria-live={isWarning ? "assertive" : "polite"}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isWarning
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <p className="pt-0.5 text-sm font-medium leading-6">{feedback.text}</p>
        </div>
      </div>
    </div>
  );
};

export default FeedbackToast;
