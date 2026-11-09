/** Decorative hero illustration: abstract rising bars with the brand swoosh. No data is implied. */
export function HeroArt() {
  const bars = [60, 95, 80, 130, 165, 215];
  return (
    <svg aria-hidden viewBox="0 0 480 360" className="h-auto w-full max-w-lg">
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".95" /><stop offset="1" stopColor="#A9C0D8" stopOpacity=".7" /></linearGradient>
      </defs>
      <rect x="10" y="10" width="460" height="340" rx="24" fill="#ffffff" fillOpacity=".06" stroke="#ffffff" strokeOpacity=".18" />
      {[90, 150, 210, 270].map((y) => <line key={y} x1="40" x2="440" y1={y} y2={y} stroke="#ffffff" strokeOpacity=".12" />)}
      {bars.map((h, i) => <rect key={i} x={62 + i * 62} y={310 - h} width="38" height={h} rx="5" fill="url(#hg)" />)}
      <path d="M24 262 C120 190 250 120 456 118 C300 124 170 190 70 292 Z" fill="#F28C1E" />
      <circle cx="402" cy="62" r="6" fill="#F28C1E" /><circle cx="424" cy="62" r="6" fill="#ffffff" fillOpacity=".5" /><circle cx="446" cy="62" r="6" fill="#ffffff" fillOpacity=".3" />
    </svg>
  );
}
