// A single sheet of nori rolling into a cylinder and unrolling again, on
// loop, while a search runs. Inline SVG + CSS keyframes (see index.css) —
// no video, no animation library. `currentColor` so it inherits whatever
// text color the caller sets (works on both light and dark accent buttons).
export default function NoriLoader({ size = 20, className = "" }) {
  return (
    <svg
      viewBox="0 0 100 40"
      width={size * 2.5}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <g className="nori-loader-roll">
        <rect x="6" y="6" width="88" height="28" rx="6" fill="currentColor" />
        <g className="nori-loader-texture">
          <rect x="18" y="6" width="3" height="28" fill="currentColor" opacity="0.35" />
          <rect x="32" y="6" width="3" height="28" fill="currentColor" opacity="0.35" />
          <rect x="46" y="6" width="3" height="28" fill="currentColor" opacity="0.35" />
          <rect x="60" y="6" width="3" height="28" fill="currentColor" opacity="0.35" />
          <rect x="74" y="6" width="3" height="28" fill="currentColor" opacity="0.35" />
        </g>
        <ellipse className="nori-loader-shine" cx="50" cy="14" rx="9" ry="5" fill="currentColor" />
      </g>
    </svg>
  );
}
