import { useCallback, useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OtpInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
};

export function OtpInput({
  id,
  value,
  onChange,
  length = 6,
  disabled,
  className,
  inputClassName
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const safeLength = Math.max(1, length);
  const normalizedValue = value.replace(/\D/g, "").slice(0, safeLength);

  const focusInput = useCallback((index: number) => {
    const target = inputsRef.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  }, []);

  const updateValueAt = useCallback(
    (index: number, nextDigit: string) => {
      const digits = Array.from({ length: safeLength }, (_, i) => normalizedValue[i] ?? "");
      digits[index] = nextDigit;
      onChange(digits.join(""));
    },
    [normalizedValue, onChange, safeLength]
  );

  const handleChange = useCallback(
    (index: number, event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      const digit = raw.replace(/\D/g, "").slice(-1);
      if (digit) {
        updateValueAt(index, digit);
        if (index < safeLength - 1) {
          requestAnimationFrame(() => focusInput(index + 1));
        }
      } else {
        updateValueAt(index, "");
      }
    },
    [focusInput, safeLength, updateValueAt]
  );

  const handleKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace") {
        event.preventDefault();
        const currentDigit = normalizedValue[index] ?? "";
        if (currentDigit) {
          updateValueAt(index, "");
        } else if (index > 0) {
          updateValueAt(index - 1, "");
          focusInput(index - 1);
        }
        return;
      }
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        focusInput(index - 1);
      }
      if (event.key === "ArrowRight" && index < safeLength - 1) {
        event.preventDefault();
        focusInput(index + 1);
      }
    },
    [focusInput, normalizedValue, safeLength, updateValueAt]
  );

  const handlePaste = useCallback(
    (index: number, event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
      if (!pasted) {
        return;
      }
      const digits = Array.from({ length: safeLength }, (_, i) => normalizedValue[i] ?? "");
      for (let offset = 0; offset < pasted.length && index + offset < safeLength; offset += 1) {
        digits[index + offset] = pasted[offset];
      }
      onChange(digits.join(""));
      const nextIndex = Math.min(index + pasted.length, safeLength - 1);
      requestAnimationFrame(() => focusInput(nextIndex));
    },
    [focusInput, normalizedValue, onChange, safeLength]
  );

  return (
    <div className={cn("flex justify-between gap-2", className)}>
      {Array.from({ length: safeLength }, (_, index) => {
        const digit = normalizedValue[index] ?? "";
        const inputId = index === 0 ? id : undefined;
        return (
          <Input
            key={index}
            ref={(node) => {
              inputsRef.current[index] = node;
            }}
            id={inputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onFocus={(event) => event.target.select()}
            onPaste={(event) => handlePaste(index, event)}
            className={cn(
              "h-12 w-12 rounded-3xl border border-input text-center text-lg font-semibold tracking-widest",
              disabled ? "opacity-75" : "shadow-sm focus:ring-2 focus:ring-primary/40",
              inputClassName
            )}
          />
        );
      })}
    </div>
  );
}
