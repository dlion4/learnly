import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  idPrefix?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
}

/** Six split OTP inputs: auto-advance, paste, backspace and arrow navigation. */
export function OTPInput({
  value,
  onChange,
  disabled = false,
  invalid = false,
  idPrefix = "signup-otp",
  ariaLabel = "Six-digit verification code",
  autoFocus = true,
}: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && !disabled) refs.current[0]?.focus();
  }, [autoFocus, disabled]);

  const fill = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 6);
    onChange(digits);
    refs.current[Math.min(digits.length, 5)]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) fill(e.clipboardData.getData("text"));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;
    if (e.key === "Backspace" && !value[index]) {
      e.preventDefault();
      onChange(value.slice(0, Math.max(0, index - 1)) + value.slice(index));
      refs.current[Math.max(0, index - 1)]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      refs.current[Math.max(0, Math.min(5, index + (e.key === "ArrowLeft" ? -1 : 1)))]?.focus();
    }
  };

  return (
    <div className="otp-input-shell" role="group" aria-label={ariaLabel} onPaste={onPaste}>
      {Array.from({ length: 6 }, (_, index) => (
        <input
          key={index}
          id={`${idPrefix}-${index}`}
          ref={(el) => { refs.current[index] = el; }}
          className="ly-otp-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of 6`}
          aria-invalid={invalid}
          value={value[index] ?? ""}
          disabled={disabled}
          maxLength={1}
          spellCheck={false}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => onKey(e, index)}
          onChange={(e) => {
            const digit = e.currentTarget.value.replace(/\D/g, "").slice(-1);
            if (!digit) {
              onChange(value.slice(0, index) + value.slice(index + 1));
              return;
            }
            if (index > value.length) {
              refs.current[value.length]?.focus();
              return;
            }
            onChange(value.slice(0, index) + digit + value.slice(index + 1));
            if (index < 5) refs.current[index + 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
