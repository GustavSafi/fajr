/**
 * Jobbares märke: två noder som möts. Vänster nod är kandidaten, höger är
 * jobbet, bågen mellan dem är matchningen. Ritad i SVG med currentColor så att
 * den fungerar i båda temana utan en enda extra regel.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      className={className}
      fill="none"
      strokeLinecap="round"
    >
      <path
        d="M6.5 20.5c0-6 4-9.5 8.5-9.5s6.5 2.4 6.5 5.2"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <circle cx="6.5" cy="20.5" r="3.1" fill="currentColor" />
      <circle cx="21.5" cy="9.6" r="3.1" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}
