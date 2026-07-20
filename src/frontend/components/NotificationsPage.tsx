"use client";

import Link from "next/link";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useNotifications, type NotificationItem, type NotificationType } from "@/frontend/hooks/useNotifications";
import { OGBadge } from "@/frontend/components/OGBadge";
import { BackButton } from "@/frontend/components/BackButton";
import { BellIcon } from "@/frontend/components/icons";
import { avatarColor, displayName, formatRelativeTime, initials, profileHref } from "@/frontend/lib/format";

const TYPE_TEXT: Record<NotificationType, string> = {
  follow: "started following you",
  repost: "reposted your post",
  tip: "sent a tip on your post",
  reaction: "reacted to your post",
  poll_result: "your poll results are in",
};

export function NotificationsPage() {
  const { walletAddress, ready } = useTwoBlockAuth();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  if (ready && !walletAddress) {
    return <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Connect your wallet to see notifications.</p>;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-[20px] font-bold text-ink">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <button className="text-[13px] font-semibold text-brand-blue" onClick={markAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {loading && notifications.length === 0 && <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Loading…</p>}
      {!loading && notifications.length === 0 && (
        <p className="px-4 py-6 text-center text-[14px] text-ink-muted">No notifications yet.</p>
      )}

      {notifications.map((n) => (
        <NotificationRow key={n.id} item={n} onRead={() => markAsRead(n.id)} />
      ))}
    </div>
  );
}

function NotificationRow({ item, onRead }: { item: NotificationItem; onRead: () => void }) {
  const actor = item.actor;
  const label = TYPE_TEXT[item.type];

  const body = (
    <>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-white"
        style={actor ? { background: avatarColor(actor.wallet_address) } : { background: "rgb(var(--color-ink) / 0.15)" }}
      >
        {actor?.avatar_url ? (
          <img src={actor.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : actor ? (
          <span className="text-[12px] font-semibold">{initials(actor.username, actor.wallet_address)}</span>
        ) : (
          <BellIcon size={16} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[14px] text-ink">
          {actor ? (
            <b className="font-semibold">
              {displayName(actor.username, actor.wallet_address)}
              <OGBadge isOg={actor.is_og} />
            </b>
          ) : (
            <b className="font-semibold">TwoBlock</b>
          )}{" "}
          {label}
        </span>
        <div className="text-[12px] text-ink-faint">{formatRelativeTime(item.created_at)}</div>
      </div>
      {!item.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-blue" />}
    </>
  );

  const rowClass = `flex items-center gap-3 border-b border-surface-border px-4 py-3 transition-colors hover:bg-surface/40 ${
    item.is_read ? "" : "bg-brand-blue/5"
  }`;

  if (actor) {
    return (
      <Link href={profileHref(actor.username, actor.wallet_address)} className={rowClass} onClick={onRead}>
        {body}
      </Link>
    );
  }
  return (
    <div className={rowClass} onClick={onRead}>
      {body}
    </div>
  );
}
