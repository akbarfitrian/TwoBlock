// Single source of truth for badge tier thresholds + colors, imported by
// both OGBadge.tsx and any progress UI (ProfilePage, QuestsPage). Mirrors
// the SQL `referral_slot_capacity()` function in
// 0020_points_referral_system.sql — keep both in sync if thresholds ever
// change.

export interface BadgeTier {
  key: string;
  label: string;
  minPoints: number;
  /// Gradient stops used to render the hexagon badge. Prismatic uses more
  /// than two stops for its rainbow sweep; everything else is a simple
  /// two-stop gradient.
  colors: string[];
  glow?: boolean;
  animated?: boolean;
  referralSlots: number;
}

export const BADGE_TIERS: BadgeTier[] = [
  { key: "base", label: "Base OG", minPoints: 0, colors: ["#888780", "#444441"], referralSlots: 0 },
  { key: "bronze", label: "Bronze", minPoints: 10, colors: ["#E3A467", "#CD7F32"], referralSlots: 1 },
  { key: "silver", label: "Silver", minPoints: 100, colors: ["#E8E8E8", "#C0C0C0"], referralSlots: 2 },
  { key: "gold", label: "Gold", minPoints: 1000, colors: ["#FFEA9E", "#FFD700"], referralSlots: 3 },
  { key: "platinum", label: "Platinum", minPoints: 10000, colors: ["#D6F7F8", "#8FDDE0"], referralSlots: 4 },
  { key: "diamond", label: "Diamond", minPoints: 100000, colors: ["#EAFBFF", "#B9F2FF"], glow: true, referralSlots: 5 },
  {
    key: "prismatic",
    label: "Prismatic",
    minPoints: 1000000,
    colors: ["#FF5F6D", "#FFC371", "#8FDDE0", "#4FACFE", "#C471ED", "#FF5F6D"],
    animated: true,
    referralSlots: 6,
  },
];

export function getBadgeTier(points: number): BadgeTier {
  let tier = BADGE_TIERS[0];
  for (const t of BADGE_TIERS) {
    if (points >= t.minPoints) tier = t;
  }
  return tier;
}

export function referralSlotCapacity(points: number): number {
  return getBadgeTier(points).referralSlots;
}

/** The next tier up, or null if the wallet is already at the top (Prismatic). */
export function nextBadgeTier(points: number): BadgeTier | null {
  const currentIndex = BADGE_TIERS.findIndex((t) => t.key === getBadgeTier(points).key);
  return BADGE_TIERS[currentIndex + 1] ?? null;
}

/** Progress (0-1) toward the next tier, for a progress bar. 1 if already at the top. */
export function progressToNextTier(points: number): number {
  const current = getBadgeTier(points);
  const next = nextBadgeTier(points);
  if (!next) return 1;
  const span = next.minPoints - current.minPoints;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (points - current.minPoints) / span));
}
