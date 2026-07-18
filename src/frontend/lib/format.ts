export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function displayName(username: string | null, walletAddress: string): string {
  return username ? `@${username}` : shortenAddress(walletAddress);
}

export function initials(username: string | null, walletAddress: string): string {
  const source = username ?? walletAddress.slice(2);
  return source.slice(0, 2).toUpperCase();
}

const AVATAR_HUES = [8, 28, 145, 165, 200, 220, 260, 285, 320, 340];

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function avatarColor(address: string): string {
  const hue = AVATAR_HUES[hashString(address) % AVATAR_HUES.length];
  return `hsl(${hue} 46% 42%)`;
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d`;

  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}
