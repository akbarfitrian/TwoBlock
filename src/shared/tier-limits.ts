import type { VerificationTier } from "@/shared/types";

export interface TierLimits {
  dailyPostLimit: number;
  maxPostChars: number;
  canAttachImage: boolean;
  canEditPost: boolean;

  canCreatePoll: boolean;
}

const TIER_LIMITS: Record<VerificationTier, TierLimits> = {
  free: { dailyPostLimit: 1, maxPostChars: 60, canAttachImage: false, canEditPost: false, canCreatePoll: false },
  verified: { dailyPostLimit: 2, maxPostChars: 150, canAttachImage: false, canEditPost: false, canCreatePoll: false },
  verified_pro: { dailyPostLimit: 2, maxPostChars: 250, canAttachImage: true, canEditPost: false, canCreatePoll: false },
  verified_max: { dailyPostLimit: 3, maxPostChars: 350, canAttachImage: true, canEditPost: true, canCreatePoll: true },
};

export function getTierLimits(tier: VerificationTier): TierLimits {
  return TIER_LIMITS[tier];
}
