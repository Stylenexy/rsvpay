/** The mark: the two triangles on the back of an envelope, meeting like an hourglass around what is kept. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 9h40a10 10 0 0 1 10 10v26a10 10 0 0 1-10 10H12A10 10 0 0 1 2 45V19A10 10 0 0 1 12 9Zm-1 8.5a1.6 1.6 0 0 0-1 2.85L27.4 31h9.2L54 20.35a1.6 1.6 0 0 0-1-2.85H11Zm16.4 15.5L10 43.65a1.6 1.6 0 0 0 1 2.85h42a1.6 1.6 0 0 0 1-2.85L36.6 33h-9.2Z"
      />
      <circle className="logo-dot" cx="32" cy="32" r="3.6" />
    </svg>
  );
}
