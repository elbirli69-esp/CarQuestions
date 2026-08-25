const EXPERT_MODE_KEY = "carquestions:expert-mode";

export function readExpertModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(EXPERT_MODE_KEY) === "1";
}

export function writeExpertModeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EXPERT_MODE_KEY, enabled ? "1" : "0");
}
