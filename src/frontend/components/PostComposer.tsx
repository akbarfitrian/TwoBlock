"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useProfile } from "@/frontend/hooks/useProfile";
import { getTierLimits } from "@/shared/tier-limits";
import { uploadPostImage, UploadError } from "@/frontend/lib/upload";
import { ImageIcon, PollIcon, XIcon } from "@/frontend/components/icons";
import { avatarColor, initials } from "@/frontend/lib/format";

const MAX_IMAGES = 4;

const DURATION_OPTIONS = [
  { label: "No time limit", hours: null },
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
];

interface PostComposerProps {
  onPost: (content: string, imageUrls?: string[]) => Promise<void>;
  onCreatePoll: (question: string, options: string[], durationHours: number | null) => Promise<void>;
}

export function PostComposer({ onPost, onCreatePoll }: PostComposerProps) {
  const { authenticated, login, walletAddress } = useTwoBlockAuth();
  const { profile, remainingQuota, refresh } = useProfile();

  const [showPoll, setShowPoll] = useState(false);
  const [content, setContent] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [durationHours, setDurationHours] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tier = profile?.verification_tier ?? "free";
  const limits = getTierLimits(tier);
  const quotaExhausted = remainingQuota !== null && remainingQuota <= 0;
  const overLimit = content.length > limits.maxPostChars;
  const filledOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
  const pollValid = content.trim().length > 0 && !overLimit && filledOptions.length >= 2;
  const canSubmit =
    authenticated &&
    !submitting &&
    !quotaExhausted &&
    (showPoll ? pollValid : content.trim().length > 0 && !overLimit);

  if (!authenticated) {
    return (
      <div className="flex gap-3 border-b border-surface-border px-4 py-3">
        <div className="mt-0.5 h-11 w-11 shrink-0 rounded-full bg-surface-soft" />

        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="block w-full cursor-pointer bg-transparent py-2 text-left text-[17px] leading-snug text-ink-faint outline-none"
            onClick={login}
          >
            Connect your wallet to start posting
          </button>

          <div className="flex items-center justify-between border-t border-surface-border pt-2.5">
            <div className="-ml-2 flex items-center gap-0.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint/50">
                <ImageIcon size={19} />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint/50">
                <PollIcon size={19} />
              </span>
            </div>

            <button
              type="button"
              className="cursor-not-allowed rounded-full bg-surface-soft px-5 py-2 text-[14px] font-bold text-ink-faint"
              disabled
            >
              Post
            </button>
          </div>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setContent("");
    setOptions(["", ""]);
    setDurationHours(null);
    setImages([]);
    setShowPoll(false);
  };

  const handleTogglePoll = () => {
    if (showPoll) {
      setShowPoll(false);
    } else {
      setImages([]);
      setShowPoll(true);
    }
  };

  const handleImagePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !walletAddress) return;
    if (images.length >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images per post.`);
      return;
    }
    setUploadingImage(true);
    setError(null);
    try {
      const url = await uploadPostImage(walletAddress, file);
      setImages((prev) => [...prev, url]);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (showPoll) {
        await onCreatePoll(content.trim(), filledOptions, durationHours);
      } else {
        await onPost(content.trim(), images);
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex gap-3 border-b border-surface-border px-4 py-3">
      <div
        className="mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-full text-[14px] font-semibold text-white"
        style={{ background: profile ? avatarColor(profile.wallet_address) : undefined }}
      >
        {profile && (
          <span className="flex h-full w-full items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(profile.username, profile.wallet_address)
            )}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <textarea
          className="w-full resize-none bg-transparent text-[17px] leading-snug text-ink placeholder:text-ink-faint outline-none"
          placeholder={showPoll ? "Ask a poll question…" : "What's on your mind?"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={showPoll ? 2 : 3}
          maxLength={limits.maxPostChars + 20}
        />

        {showPoll && (
          <div className="mt-1 mb-3 flex flex-col gap-2 rounded-2xl border border-surface-border p-3">
            {options.map((opt, i) => (
              <input
                key={i}
                className="w-full rounded-xl border border-surface-border bg-transparent px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint outline-none focus:border-brand-blue/50"
                placeholder={`Option ${i + 1}`}
                value={opt}
                maxLength={80}
                onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
              />
            ))}
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
              {options.length < 4 && (
                <button type="button" className="font-semibold text-brand-blue" onClick={() => setOptions((prev) => [...prev, ""])}>
                  + Add option
                </button>
              )}
              {options.length > 2 && (
                <button
                  type="button"
                  className="font-semibold text-ink-muted"
                  onClick={() => setOptions((prev) => prev.slice(0, -1))}
                >
                  − Remove option
                </button>
              )}
              <select
                className="ml-auto rounded-lg border border-accent/40 bg-transparent px-2 py-1 text-ink"
                style={{ accentColor: "rgb(var(--color-accent))" }}
                value={durationHours ?? ""}
                onChange={(e) => setDurationHours(e.target.value ? Number(e.target.value) : null)}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option
                    key={d.label}
                    value={d.hours ?? ""}
                    className="bg-surface text-ink"
                    style={{
                      backgroundColor: "color-mix(in srgb, rgb(var(--color-surface)) 85%, rgb(var(--color-accent)) 15%)",
                      color: "rgb(var(--color-ink))",
                    }}
                  >
                    {d.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
                onClick={handleTogglePoll}
                title="Remove poll"
              >
                <XIcon size={12} />
              </button>
            </div>
          </div>
        )}

        {!showPoll && limits.canAttachImage && images.length > 0 && (
          <div
            className={`mt-1 mb-3 grid gap-1.5 overflow-hidden rounded-2xl ${
              images.length === 1 ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            {images.map((url, i) => (
              <div key={url} className={`group relative ${images.length === 1 ? "max-h-80" : "aspect-square"} overflow-hidden`}>
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-90 transition-opacity hover:opacity-100"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <XIcon size={13} />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button
                type="button"
                className={`flex items-center justify-center border border-dashed border-surface-border text-ink-faint transition-colors hover:border-brand-blue/50 hover:text-brand-blue disabled:opacity-50 ${
                  images.length === 1 ? "h-24 rounded-2xl" : "aspect-square rounded-none"
                }`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? "…" : <ImageIcon size={22} />}
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={handleImagePick}
        />

        <div className="flex items-center justify-between border-t border-surface-border pt-2.5">
          <div className="-ml-2 flex items-center gap-0.5">
            {!showPoll && limits.canAttachImage && images.length === 0 && (
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-brand-blue transition-colors hover:bg-brand-blue/10 disabled:opacity-40"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                title="Add image"
              >
                {uploadingImage ? <span className="text-[12px]">…</span> : <ImageIcon size={19} />}
              </button>
            )}
            {limits.canCreatePoll && images.length === 0 && (
              <button
                type="button"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  showPoll ? "bg-brand-blue/10 text-brand-blue" : "text-brand-blue hover:bg-brand-blue/10"
                }`}
                onClick={handleTogglePoll}
                title={showPoll ? "Remove poll" : "Add poll"}
              >
                <PollIcon size={19} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[12px] ${overLimit ? "font-semibold text-danger" : "text-ink-faint"}`}>
              {content.length}/{limits.maxPostChars}
            </span>
            {remainingQuota !== null && (
              <span className="hidden rounded-full bg-surface-soft px-2.5 py-1 text-[12px] font-medium text-ink-muted sm:inline">
                {quotaExhausted ? "Daily quota reached" : `${remainingQuota}/${limits.dailyPostLimit} posts left today`}
              </span>
            )}
            <button
              className="rounded-full bg-brand-gradient px-5 py-2 text-[14px] font-bold text-accent-contrast shadow-glow transition-transform duration-150 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? "Posting…" : showPoll ? "Create Poll" : "Post"}
            </button>
          </div>
        </div>
        {remainingQuota !== null && (
          <p className="mt-1.5 text-[12px] text-ink-faint sm:hidden">
            {quotaExhausted ? "Daily post quota reached" : `${remainingQuota} posts left today`}
          </p>
        )}
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </div>
    </div>
  );
}
