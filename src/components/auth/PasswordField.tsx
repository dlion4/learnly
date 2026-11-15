import { useState } from "react";
import { useWatch, type Control, type UseFormRegister } from "react-hook-form";
import type { SignupFormValues } from "../../data/auth";

interface Props {
  field: "password" | "confirmPassword";
  label: string;
  register: UseFormRegister<SignupFormValues>;
  control: Control<SignupFormValues>;
  error?: string;
}

export function PasswordField({ field, label, register, control, error }: Props) {
  const [visible, setVisible] = useState(false);
  const value = useWatch({ control, name: field }) ?? "";
  const score = field === "confirmPassword" ? 0 : [
    value.length >= 10,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9\s]/.test(value),
  ].filter(Boolean).length;

  return (
    <div className="ly-field">
      <label className="ly-label" htmlFor={field}>{label}</label>
      <div className={`password-input-shell ${error ? "is-invalid" : ""}`}>
        <input
          {...register(field)}
          id={field}
          type={visible ? "text" : "password"}
          className="ly-input"
          placeholder={field === "password" ? "At least 10 characters" : "Re-enter your password"}
          autoComplete={field === "password" ? "new-password" : "off"}
          aria-invalid={!!error}
          aria-describedby={`${field}-hint`}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {visible ? (
              <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.5 5.4A11 11 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3 3.8M6.2 6.2A20 20 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.8-1.8" /></>
            ) : (
              <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>
            )}
          </svg>
        </button>
      </div>
      {field === "password" && value.length > 0 && (
        <div className="password-strength">
          <div className="password-strength-bars" role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ background: i < score ? (score < 2 ? "var(--brand-danger)" : score < 4 ? "var(--brand-warning)" : "var(--brand-success)") : "var(--surface-3)" }} />
            ))}
          </div>
          <span>{["Very weak", "Weak", "Fair", "Good", "Strong"][score]}</span>
        </div>
      )}
      {error ? (
        <span id={`${field}-hint`} className="ly-error" role="alert">{error}</span>
      ) : (
        <span id={`${field}-hint`} className="ly-hint">
          {field === "password" ? "10+ characters, at least one number and one symbol." : "Both passwords must match."}
        </span>
      )}
    </div>
  );
}
