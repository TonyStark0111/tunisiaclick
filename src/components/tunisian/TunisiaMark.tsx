/** Simple crescent-and-star mark for Tunisia (inline SVG). */
export default function TunisiaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2a6 6 0 0 1 0 12 5 5 0 0 0 0-12z" />
      <path d="M14.5 9.5l.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.8-1.6.8.3-1.8-1.3-1.3 1.8-.3.8-1.6z" />
    </svg>
  )
}
