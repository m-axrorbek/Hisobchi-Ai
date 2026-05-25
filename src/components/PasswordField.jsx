import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

const PasswordField = ({
  value,
  onChange,
  placeholder = "Parol",
  autoComplete = "current-password",
  className = "",
  inputClassName = "",
  disabled = false,
  id,
  name,
  ariaInvalid = false
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn("pr-11", inputClassName)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-ink-400 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300 dark:text-ink-500 dark:hover:text-white"
        aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
        aria-pressed={visible}
        disabled={disabled}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

export default PasswordField;
