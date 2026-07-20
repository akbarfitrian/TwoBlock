"use client";

import { useEffect, useRef, useState } from "react";
import { EmojiIcon } from "@/frontend/components/icons";

// A small curated set rather than a full unicode emoji library — keeps the
// bundle light and avoids pulling in a dependency just for this. Grouped
// loosely by category; feel free to extend.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: ["😀", "😂", "😅", "😍", "🤔", "😎", "🙃", "😭", "😡", "🥳", "😴", "🤯"],
  },
  {
    label: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "✌️", "🤞", "👀", "🔥", "💯"],
  },
  {
    label: "Crypto & money",
    emojis: ["🚀", "📈", "📉", "💰", "💎", "🪙", "⚡", "🌕", "🐂", "🐻", "🧧", "🤑"],
  },
  {
    label: "Objects",
    emojis: ["❤️", "⭐", "✅", "❌", "⚠️", "🎉", "💡", "🔒", "📌", "🎯", "🕒", "🔗"],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          open ? "bg-brand-blue/10 text-brand-blue" : "text-brand-blue hover:bg-brand-blue/10"
        } disabled:opacity-40`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="Add emoji"
      >
        <EmojiIcon size={19} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-72 max-w-[80vw] overflow-hidden rounded-2xl border border-surface-border bg-surface p-3 shadow-card">
          <div className="max-h-64 overflow-y-auto pr-1">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label} className="mb-2.5 last:mb-0">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{group.label}</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[18px] transition-colors hover:bg-surface-hover"
                      onClick={() => {
                        onSelect(emoji);
                        setOpen(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
