import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Database, LogOut, Shield, UserRound, Volume2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import FeedbackToast from "./FeedbackToast";
import PasswordField from "./PasswordField";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { hasUzbekVoiceKey } from "../lib/uzbekVoice";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";
import { cn } from "../lib/utils";

const PROFILE_TABS = [
  { key: "profile", label: "Profil" },
  { key: "security", label: "Xavfsizlik" }
];

const SettingsSheet = () => {
  const { t } = useTranslation();
  const settingsOpen = useSettingsStore((state) => state.settingsOpen);
  const panelMode = useSettingsStore((state) => state.panelMode);
  const activeTab = useSettingsStore((state) => state.activeTab);
  const setActiveTab = useSettingsStore((state) => state.setActiveTab);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.currentUser);
  const users = useAuthStore((state) => state.users);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: ""
  });
  const [feedback, setFeedback] = useState(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const { dialogRef } = useAccessibleDialog({
    open: settingsOpen,
    onClose: closeSettings,
    initialFocusRef: closeButtonRef
  });

  const currentUserRecord = useMemo(
    () => users.find((user) => user.id === currentUser?.id) || currentUser,
    [currentUser, users]
  );

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    setProfileForm({
      name: currentUserRecord?.name || "",
      email: currentUserRecord?.email || ""
    });
    setPasswordForm({
      password: "",
      confirmPassword: ""
    });
    setProfileErrors({});
    setPasswordErrors({});
  }, [currentUserRecord?.email, currentUserRecord?.name, settingsOpen]);

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  if (!settingsOpen) {
    return null;
  }

  const isProfileMode = panelMode === "profile";
  const dialogTitle = isProfileMode ? "Profil markazi" : t("settings");
  const dialogDescription = isProfileMode
    ? "Profil ma'lumotlari va xavfsizlikni shu yerda boshqaring."
    : "Ko'rinish va tizim holatini shu yerda boshqaring.";

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    const nextErrors = validateProfileForm(profileForm);

    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors);
      return;
    }

    setIsUpdatingProfile(true);
    setFeedback(null);

    try {
      await updateProfile({
        name: profileForm.name
      });
      setFeedback({
        tone: "success",
        text: "Profil yangilandi."
      });
    } catch (error) {
      setFeedback({
        tone: "warning",
        text: resolveProfileError(error)
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    const nextErrors = validatePasswordForm(passwordForm);

    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors);
      return;
    }

    setIsUpdatingPassword(true);
    setFeedback(null);

    try {
      await updatePassword({
        password: passwordForm.password
      });
      setPasswordForm({
        password: "",
        confirmPassword: ""
      });
      setPasswordErrors({});
      setFeedback({
        tone: "success",
        text: "Parol muvaffaqiyatli yangilandi."
      });
    } catch (error) {
      setFeedback({
        tone: "warning",
        text: resolveSecurityError(error)
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[75] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        onClick={closeSettings}
        aria-label={t("close")}
        tabIndex={-1}
      />
      <div className="relative grid min-h-screen place-items-center p-4 sm:p-6">
        <div ref={dialogRef} tabIndex={-1} className={`relative z-10 w-full ${isProfileMode ? "max-w-4xl" : "max-w-md"}`}>
          <Card
            className={cn(
              "rounded-[2rem] border border-black/10 shadow-[0_32px_90px_rgba(0,0,0,0.16)] dark:border-white/10 dark:shadow-[0_32px_90px_rgba(0,0,0,0.55)]",
              isProfileMode ? "bg-white/96 dark:bg-[#121212]/96" : "bg-white dark:bg-[#111111]"
            )}
          >
            <CardHeader className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle id={titleId} className={cn("section-title", isProfileMode ? "text-[1.15rem]" : "text-base")}>
                  {dialogTitle}
                </CardTitle>
                <p id={descriptionId} className={cn("text-ink-500 dark:text-ink-400", isProfileMode ? "text-sm" : "text-xs")}>
                  {dialogDescription}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeSettings}
                className="rounded-full p-2 text-ink-500 transition-colors hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className={cn(isProfileMode ? "space-y-6" : "space-y-5")}>
              {isProfileMode ? (
                <>
                  <div className="inline-flex w-full rounded-full border border-ink-200 bg-ink-50 p-1 dark:border-ink-700 dark:bg-ink-800/85">
                    {PROFILE_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                          activeTab === tab.key
                            ? "bg-white text-ink-950 shadow-soft dark:bg-white dark:text-ink-900"
                            : "text-ink-500 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === "profile" ? (
                    <div className="space-y-5">
                      <div className="rounded-[1.75rem] border border-ink-200 bg-ink-50/70 p-5 dark:border-ink-700 dark:bg-ink-900/70">
                        <div className="flex items-start gap-4">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-white dark:bg-white dark:text-ink-900">
                            <UserRound className="h-5 w-5" />
                          </span>
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-ink-950 dark:text-ink-50">Profil ma'lumotlari</p>
                            <p className="text-sm leading-6 text-ink-500 dark:text-ink-400">
                              Ismni yangilang, email esa shu profilga bog'langan holda ko'rinadi.
                            </p>
                          </div>
                        </div>
                      </div>

                      <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleUpdateProfile}>
                        <Field label="Ism familiya" error={profileErrors.name}>
                          <Input
                            value={profileForm.name}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setProfileForm((current) => ({
                                ...current,
                                name: nextValue
                              }));
                              setProfileErrors((current) => (current.name ? { ...current, name: "" } : current));
                            }}
                            placeholder="Ism familiya"
                            aria-invalid={Boolean(profileErrors.name)}
                            className={profileErrors.name ? "border-red-300 dark:border-red-500/70" : ""}
                          />
                        </Field>

                        <Field label="Email">
                          <Input
                            value={profileForm.email}
                            readOnly
                            aria-readonly="true"
                            className="bg-ink-50/80 text-[0.95rem] dark:bg-ink-800/80"
                          />
                        </Field>

                        <div className="flex justify-end lg:col-span-2">
                          <Button type="submit" className="rounded-2xl px-6" disabled={isUpdatingProfile}>
                            {isUpdatingProfile ? "Saqlanmoqda..." : "O'zgarishlarni saqlash"}
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : null}

                  {activeTab === "security" ? (
                    <div className="space-y-4">
                      <div className="rounded-[1.75rem] border border-ink-200 bg-ink-50/70 p-5 dark:border-ink-700 dark:bg-ink-900/70">
                        <div className="flex items-start gap-4">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-white dark:bg-white dark:text-ink-900">
                            <Shield className="h-5 w-5" />
                          </span>
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-ink-950 dark:text-ink-50">Xavfsizlik boshqaruvi</p>
                            <p className="text-sm leading-6 text-ink-500 dark:text-ink-400">
                              Parolni yangilang yoki kerak bo'lsa sessiyani yakunlang.
                            </p>
                          </div>
                        </div>
                      </div>

                      <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleUpdatePassword}>
                        <Field label="Yangi parol" error={passwordErrors.password}>
                          <PasswordField
                            value={passwordForm.password}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setPasswordForm((current) => ({
                                ...current,
                                password: nextValue
                              }));
                              setPasswordErrors((current) => (current.password ? { ...current, password: "" } : current));
                            }}
                            placeholder="Kamida 6 ta belgi"
                            autoComplete="new-password"
                            ariaInvalid={Boolean(passwordErrors.password)}
                            inputClassName={passwordErrors.password ? "border-red-300 dark:border-red-500/70" : ""}
                          />
                        </Field>

                        <Field label="Parolni tasdiqlang" error={passwordErrors.confirmPassword}>
                          <PasswordField
                            value={passwordForm.confirmPassword}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setPasswordForm((current) => ({
                                ...current,
                                confirmPassword: nextValue
                              }));
                              setPasswordErrors((current) =>
                                current.confirmPassword ? { ...current, confirmPassword: "" } : current
                              );
                            }}
                            placeholder="Yangi parolni takrorlang"
                            autoComplete="new-password"
                            ariaInvalid={Boolean(passwordErrors.confirmPassword)}
                            inputClassName={passwordErrors.confirmPassword ? "border-red-300 dark:border-red-500/70" : ""}
                          />
                        </Field>

                        <div className="flex flex-col gap-3 lg:col-span-2 lg:flex-row lg:justify-end">
                          <Button type="button" variant="outline" className="rounded-2xl" onClick={logout}>
                            <LogOut className="h-4 w-4" /> Chiqish
                          </Button>
                          <Button type="submit" className="rounded-2xl" disabled={isUpdatingPassword}>
                            <Shield className="h-4 w-4" />
                            {isUpdatingPassword ? "Yangilanmoqda..." : "Parolni yangilash"}
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="space-y-5">
                  <InfoRow
                    title="Offline saqlash"
                    hint="Yozuvlar brauzer ichida saqlanadi va offline ko'rinadi."
                    icon={<Database className="h-5 w-5 text-ink-400 dark:text-ink-500" aria-hidden="true" />}
                  />

                  <InfoRow
                    title="UzbekVoice STT"
                    hint={hasUzbekVoiceKey() ? t("aiReady") : t("sttMissing")}
                    icon={<Volume2 className="h-5 w-5 text-ink-400 dark:text-ink-500" aria-hidden="true" />}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{t("appearance")}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-400"> Oqartirilgan yoki qoramtir ko'rinishni almashtiring.</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <FeedbackToast feedback={feedback} />
    </div>
  );

  return createPortal(content, document.body);
};

const Field = ({ label, children, error = "" }) => (
  <label className="grid gap-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">
    <span>{label}</span>
    {children}
    {error ? <span className="text-xs text-red-500">{error}</span> : null}
  </label>
);

const InfoRow = ({ title, hint, icon }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="space-y-1">
      <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{title}</p>
      <p className="text-xs text-ink-500 dark:text-ink-400">{hint}</p>
    </div>
    {icon}
  </div>
);

const validateProfileForm = ({ name = "" }) => {
  const nextErrors = {};

  if (String(name).trim().length < 2) {
    nextErrors.name = "Ism kamida 2 harfdan iborat bo'lsin.";
  }

  return nextErrors;
};

const validatePasswordForm = ({ password = "", confirmPassword = "" }) => {
  const nextErrors = {};

  if (String(password).trim().length < 6) {
    nextErrors.password = "Parol kamida 6 ta belgidan iborat bo'lsin.";
  }
  if (password !== confirmPassword) {
    nextErrors.confirmPassword = "Parollar mos kelmadi.";
  }

  return nextErrors;
};

const resolveSecurityError = (error) => {
  const code = String(error?.message || "");

  if (code === "AUTH_PASSWORD_SHORT") {
    return "Parol kamida 6 ta belgidan iborat bo'lsin.";
  }

  return "Parolni yangilab bo'lmadi.";
};

const resolveProfileError = (error) => {
  const code = String(error?.message || "");

  if (code === "AUTH_NAME_INVALID") {
    return "Ism kamida 2 harfdan iborat bo'lsin.";
  }

  return "Profilni yangilab bo'lmadi.";
};

export default SettingsSheet;
