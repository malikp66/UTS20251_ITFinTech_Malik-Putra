import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(amount);
}

export function normalizePhoneNumber(input: string) {
  const value = (input || "").replace(/[^0-9+]/g, "");
  if (value.startsWith("+62")) {
    return value.slice(1);
  }
  if (value.startsWith("62")) {
    return value;
  }
  if (value.startsWith("0")) {
    return `62${value.slice(1)}`;
  }
  if (value.startsWith("8")) {
    return `62${value}`;
  }
  return value;
}
