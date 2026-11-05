/** The flat seal: the glass seal without its material. A ring, the V of an envelope flap that breaks the rim as a tick, and the one thing kept. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d="M29 9a26 26 0 1 0 0 52a26 26 0 1 0 0-52Zm0 5a21 21 0 1 1 0 42a21 21 0 1 1 0-42Z" />
      <path fill="currentColor" d="M8 25 29 39 59 8 29 49Z" />
      <circle className="logo-dot" cx="29" cy="31.500" r="4" />
    </svg>
  );
}
