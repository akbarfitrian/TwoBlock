import { getBadgeTier } from "@/shared/badge-tiers";

/// Badge tier colors are the single personalization surface OG members
/// get — see src/shared/badge-tiers.ts for the full tier table. Every
/// non-OG wallet still returns null here regardless of points (badges
/// are OG-exclusive; points quietly accumulate in the background either
/// way, which is what powers the "reveal" effect on OG purchase).
export function OGBadge({ isOg, points = 0, size = 16 }: { isOg: boolean; points?: number; size?: number }) {
  if (!isOg) return null;

  const tier = getBadgeTier(points);
  const gradientId = `ogHexGradient-${tier.key}`;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label={`OG · ${tier.label}`}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <title>{`OG · ${tier.label}`}</title>
      <defs>
        <linearGradient id={gradientId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          {tier.colors.map((color, index) => (
            <stop key={index} offset={index / Math.max(1, tier.colors.length - 1)} stopColor={color}>
              {tier.animated && (
                <animate
                  attributeName="stop-color"
                  values={[...tier.colors, tier.colors[0]].join(";")}
                  dur="4s"
                  repeatCount="indefinite"
                  begin={`${-index * 0.4}s`}
                />
              )}
            </stop>
          ))}
        </linearGradient>
        {tier.glow && (
          <filter id="ogHexGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path
        d="M12 1.5l9 5.2v10.6l-9 5.2-9-5.2V6.7l9-5.2z"
        fill={`url(#${gradientId})`}
        filter={tier.glow ? "url(#ogHexGlow)" : undefined}
      />
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
