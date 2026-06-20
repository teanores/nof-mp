const primaryBase =
  "tech-label rounded-sm border px-5 py-3 text-xs font-bold transition";

const compactPrimaryBase =
  "tech-label min-h-10 rounded-sm border px-4 py-2 text-center text-[10px] font-bold transition";

const primaryEnabled =
  "border-forge-accent bg-forge-accent text-black hover:brightness-110";

const primaryDisabled =
  "cursor-not-allowed border-forge-line bg-forge-surface text-forge-muted";

export function primaryActionClassName(isDisabled: boolean, extraClassName = ""): string {
  return [primaryBase, isDisabled ? primaryDisabled : primaryEnabled, extraClassName].filter(Boolean).join(" ");
}

export function compactPrimaryActionClassName(isDisabled: boolean, extraClassName = ""): string {
  return [compactPrimaryBase, isDisabled ? primaryDisabled : primaryEnabled, extraClassName].filter(Boolean).join(" ");
}
