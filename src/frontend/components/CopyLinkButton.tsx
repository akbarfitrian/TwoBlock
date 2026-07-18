"use client";

import { useState } from "react";
import { LinkIcon, CheckIcon } from "@/frontend/components/icons";

export function CopyLinkButton({ authorWallet, postId }: { authorWallet: string; postId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/profile/${authorWallet}#post-${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("[TwoBlock] Failed to copy link:", err);
    }
  };

  return (
    <button
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
      onClick={handleCopy}
      title="Copy link to post"
      type="button"
    >
      {copied ? <CheckIcon size={16} /> : <LinkIcon size={16} />}
    </button>
  );
}
