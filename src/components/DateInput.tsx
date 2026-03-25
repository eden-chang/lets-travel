import { useState, useEffect, useRef, ChangeEvent } from "react";
import { TRIP } from "../constants";

interface DateInputProps {
  value: string;
  onChange: (isoDate: string) => void;
  className?: string;
}

function toMMDD(isoDate: string): string {
  if (!isoDate) return "";
  return isoDate.slice(5).replace("-", "");
}

function formatDisplay(raw: string): string {
  if (!raw) return "";
  return raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
}

export function DateInput({ value, onChange, className }: DateInputProps) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const hasEdited = useRef(false);

  useEffect(() => {
    if (!hasEdited.current) {
      setInput("");
    } else {
      setInput(toMMDD(value));
    }
  }, [value]);

  const placeholder = value ? formatDisplay(toMMDD(value)) : "MM/DD";

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    hasEdited.current = true;
    setInput(digits);

    if (digits.length !== 4) return;

    const mm = digits.slice(0, 2);
    const dd = digits.slice(2, 4);
    const mmN = parseInt(mm, 10);
    const ddN = parseInt(dd, 10);

    if (mmN >= 1 && mmN <= 12 && ddN >= 1 && ddN <= 31) {
      onChange(`${TRIP.year}-${mm}-${dd}`);
    } else {
      setInput("");
    }
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
    // 아무것도 안 치고 나가면 기본값 유지
    if (!input && !hasEdited.current) return;
    // 중간까지만 치고 나가면 리셋
    if (input && input.length < 4) {
      setInput("");
      hasEdited.current = false;
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={focused || input ? formatDisplay(input) : ""}
      onChange={(e) => {
        const raw = e.target.value.replace(/\//g, "");
        handleChange({ target: { value: raw } } as ChangeEvent<HTMLInputElement>);
      }}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      maxLength={5}
      className={className}
    />
  );
}
