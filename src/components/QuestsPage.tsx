"use client";

import { useTwoBlockAuth } from "@/hooks/useTwoBlockAuth";
import { useQuests } from "@/hooks/useQuests";
import { BackButton } from "@/components/BackButton";
import { FeatherIcon, CoinIcon, VerifiedCheckIcon, FlameIcon, CheckIcon } from "@/components/icons";

const QUEST_ICONS: Record<string, React.ReactNode> = {
  post: <FeatherIcon size={22} />,
  tip: <CoinIcon size={20} />,
  verified: <VerifiedCheckIcon size={18} />,
  streak: <FlameIcon size={20} />,
};

export function QuestsPage() {
  const { walletAddress, ready } = useTwoBlockAuth();
  const { quests, loading, completedCount } = useQuests();

  if (ready && !walletAddress) {
    return <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Connect your wallet to view quests.</p>;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-[20px] font-bold text-ink">Quests</h1>
        </div>
        {quests.length > 0 && (
          <span className="text-[13px] font-semibold text-ink-muted">
            {completedCount}/{quests.length} completed
          </span>
        )}
      </div>

      {loading && quests.length === 0 && <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Loading…</p>}

      <div className="flex flex-col gap-3 p-4">
        {quests.map((q) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          return (
            <div
              key={q.key}
              className={`flex gap-3 rounded-2xl border p-4 shadow-card ${
                q.completed ? "border-brand-blue/40 bg-brand-blue/5" : "border-surface-border bg-surface"
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink-muted">
                {QUEST_ICONS[q.icon] ?? <FeatherIcon size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                  {q.title}
                  {q.completed && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-blue text-white">
                      <CheckIcon size={10} />
                    </span>
                  )}
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-muted">{q.description}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                  <div className="h-full rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
                </div>
                <span className="mt-1 block text-[12px] text-ink-faint">
                  {q.progress}/{q.target}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
