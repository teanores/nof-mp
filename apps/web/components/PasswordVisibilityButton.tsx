"use client";

interface PasswordVisibilityButtonProps {
  hideLabel: string;
  isVisible: boolean;
  onClick: () => void;
  showLabel: string;
}

export function PasswordVisibilityButton({ hideLabel, isVisible, onClick, showLabel }: PasswordVisibilityButtonProps) {
  return (
    <button
      aria-label={isVisible ? hideLabel : showLabel}
      aria-pressed={isVisible}
      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-sm border border-transparent text-forge-muted transition hover:border-forge-line hover:text-forge-accent focus:border-forge-accent focus:outline-none"
      title={isVisible ? hideLabel : showLabel}
      type="button"
      onClick={onClick}
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        {isVisible ? (
          <>
            <path d="M3 3l18 18" />
            <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
            <path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5 0 8.5 4.1 10 8a15.2 15.2 0 0 1-3.1 4.8" />
            <path d="M6.6 6.6A15.2 15.2 0 0 0 2 12c1.5 3.9 5 8 10 8a10.7 10.7 0 0 0 4.1-.8" />
          </>
        ) : (
          <>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
}
