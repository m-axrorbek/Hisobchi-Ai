import { useState } from "react";
import FeedbackToast from "../components/FeedbackToast";
import PasswordField from "../components/PasswordField";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/useAuthStore";

const Auth = () => {
  const register = useAuthStore((state) => state.register);
  const login = useAuthStore((state) => state.login);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setFeedback(null);
    setForm((current) => ({
      name: nextMode === "register" ? current.name : "",
      email: current.email,
      password: current.password
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (mode === "register") {
        await register(form);
      } else {
        await login(form);
      }
    } catch (error) {
      setFeedback({
        tone: "warning",
        text: resolveAuthError(error, mode)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8f8f8] text-ink-950 dark:bg-[#090909] dark:text-ink-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.06),_transparent_36%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(245,245,245,0.96))] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_28%),linear-gradient(180deg,_rgba(15,15,15,0.96),_rgba(8,8,8,1))]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white/92 p-1 shadow-[0_30px_90px_rgba(0,0,0,0.1)] backdrop-blur dark:border-white/10 dark:bg-[#111111]/92">
          <CardContent className="space-y-7 p-6 sm:p-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-ink-500 dark:text-ink-400">
                HISOBCHI AI
              </p>
              <div className="space-y-2">
                <h1 className="section-title text-[2.15rem] leading-none sm:text-[2.5rem]">
                  {mode === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
                </h1>
                <p className="text-sm leading-6 text-ink-500 dark:text-ink-400">
                  {mode === "login"
                    ? "Email va parol bilan davom eting."
                    : "Yangi profil yaratish uchun asosiy ma'lumotlarni kiriting."}
                </p>
              </div>
            </div>

            <div className="inline-flex w-full rounded-full border border-ink-200 bg-ink-50 p-1 dark:border-ink-700 dark:bg-ink-800/80">
              <button type="button" onClick={() => handleModeChange("login")} className={modeTabClass(mode === "login")}>
                Kirish
              </button>
              <button type="button" onClick={() => handleModeChange("register")} className={modeTabClass(mode === "register")}>
                Register
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <Field label="Ism">
                  <Input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Ismingiz"
                    autoComplete="name"
                  />
                </Field>
              ) : null}

              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>

              <Field label="Parol">
                <PasswordField
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </Field>

              <Button type="submit" className="h-11 w-full rounded-2xl" disabled={isSubmitting}>
                {isSubmitting ? "Tekshirilmoqda..." : mode === "login" ? "Kirish" : "Akkaunt yaratish"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <FeedbackToast feedback={feedback} />
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="grid gap-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">
    <span>{label}</span>
    {children}
  </label>
);

const modeTabClass = (active) =>
  cn(
    "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200",
    active
      ? "bg-ink-900 text-white shadow-soft dark:bg-white dark:text-ink-900"
      : "text-ink-500 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
  );

const resolveAuthError = (error, mode) => {
  const code = String(error?.message || "");

  if (code === "AUTH_NAME_INVALID") {
    return "Ismni kamida 2 harf bilan kiriting.";
  }
  if (code === "AUTH_EMAIL_INVALID") {
    return "Email manzili noto'g'ri ko'rinmoqda.";
  }
  if (code === "AUTH_PASSWORD_SHORT") {
    return "Parol kamida 6 ta belgidan iborat bo'lsin.";
  }
  if (code === "AUTH_EMAIL_TAKEN") {
    return "Bu email bilan akkaunt allaqachon mavjud.";
  }
  if (code === "AUTH_LOGIN_FAILED") {
    return "Email yoki parol mos kelmadi.";
  }

  return mode === "login" ? "Kirish amalga oshmadi." : "Ro'yxatdan o'tish amalga oshmadi.";
};

export default Auth;
