/// Fixed graphite hexagon — part of member identity, not a personalization
/// option. Every OG member gets the exact same badge; there's no color
/// picker or styling choice here.
const OG_GRAPHITE_DARK = "#444441";
const OG_GRAPHITE_LIGHT = "#888780";

export function OGBadge({ isOg, size = 16 }: { isOg: boolean; size?: number }) {
  if (!isOg) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label="OG"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <title>OG</title>
      <defs>
        <linearGradient id="ogHexGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={OG_GRAPHITE_LIGHT} />
          <stop offset="1" stopColor={OG_GRAPHITE_DARK} />
        </linearGradient>
      </defs>
      <path d="M12 1.5l9 5.2v10.6l-9 5.2-9-5.2V6.7l9-5.2z" fill="url(#ogHexGradient)" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="700"
        fontFamily="inherit"
        fill="#fff"
        letterSpacing="0.5"
      >
        OG
      </text>
    </svg>
  );
}
