export interface TierLimits {
  dailyPostLimit: number;
  maxPostChars: number;
  canAttachImage: boolean;
  canEditPost: boolean;

  canCreatePoll: boolean;

  canGatePost: boolean;

  // Short video attachments (max 2MB, see upload.ts). Same eligibility as
  // images for both tiers today, but kept as its own flag since video is
  // more storage-expensive and may get its own tiering later.
  canAttachVideo: boolean;
}

const TIER_LIMITS: Record<"free" | "og", TierLimits> = {
  free: { dailyPostLimit: 5, maxPostChars: 250, canAttachImage: true, canEditPost: false, canCreatePoll: true, canGatePost: false, canAttachVideo: true },
  og: { dailyPostLimit: 20, maxPostChars: 2_000, canAttachImage: true, canEditPost: true, canCreatePoll: true, canGatePost: true, canAttachVideo: true },
};

export function getTierLimits(isOg: boolean): TierLimits {
  return TIER_LIMITS[isOg ? "og" : "free"];
}
