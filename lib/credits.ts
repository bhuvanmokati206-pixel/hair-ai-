"use client";

// Credit management — localStorage-backed in demo/SKIP_AUTH mode.
// When Supabase auth is on, swap these for server-side Supabase calls.

const KEY = "hair_ai_credits";
const DEFAULT_CREDITS = 20;

export function getCredits(): number {
  if (typeof window === "undefined") return DEFAULT_CREDITS;
  const v = localStorage.getItem(KEY);
  if (v === null) {
    localStorage.setItem(KEY, String(DEFAULT_CREDITS));
    return DEFAULT_CREDITS;
  }
  return Math.max(0, parseInt(v, 10) || 0);
}

// TEMP: credit deduction disabled while testing image generation — always succeeds.
// Revert by restoring the commented-out logic below before shipping.
export function deductCredits(amount: number): boolean {
  void amount;
  return true;
  // const current = getCredits();
  // if (current < amount) return false;
  // localStorage.setItem(KEY, String(current - amount));
  // window.dispatchEvent(new CustomEvent("credits-changed", { detail: current - amount }));
  // return true;
}

export function addCredits(amount: number): void {
  const current = getCredits();
  const next = current + amount;
  localStorage.setItem(KEY, String(next));
  window.dispatchEvent(new CustomEvent("credits-changed", { detail: next }));
}
