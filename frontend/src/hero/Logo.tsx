/** The mark: a seal whose two envelope flaps meet like an hourglass around the one thing kept. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d="M32 2a30 30 0 1 0 0 60a30 30 0 1 0 0-60ZM13.500 15.500h37L32 29ZM32 35l18.500 13.500h-37Z" />
      <circle className="logo-dot" cx="32" cy="32" r="2.800" />
    </svg>
  );
}
