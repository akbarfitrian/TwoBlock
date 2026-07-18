import type { VerificationTier } from "@/shared/types";

const TIER_LABEL: Record<VerificationTier, string> = {
  free: "",
  verified: "Verified",
  verified_pro: "Verified Pro",
  verified_max: "Verified Max",
};

const TIER_COLOR: Record<VerificationTier, string> = {
  free: "",
  verified: "#2563EB",
  verified_pro: "#D97706",
  verified_max: "#DC2626",
};

export function VerifiedBadge({ tier, size = 16 }: { tier: VerificationTier; size?: number }) {
  if (tier === "free") return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={TIER_COLOR[tier]}
      aria-label={TIER_LABEL[tier]}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <title>{TIER_LABEL[tier]}</title>
      <path d="M12 2l2.4 2.2 3.2-.6.9 3.1 2.9 1.5-.9 3.2 1.5 2.9-2.6 2 .3 3.3-3.2.6L15 23l-3-1.8L9 23l-1.5-3.7-3.2-.6.3-3.3-2.6-2 1.5-2.9-.9-3.2 2.9-1.5.9-3.1 3.2.6L12 2z" />
      <path d="M9 12.5l2 2 4-4.5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
