"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useProfile } from "@/frontend/hooks/useProfile";
import { getTierLimits } from "@/shared/tier-limits";
import { uploadPostImage, uploadPostVideo, UploadError } from "@/frontend/lib/upload";
import { ImageIcon, PollIcon, VideoIcon, XIcon } from "@/frontend/components/icons";
import { OPEN_COMPOSER_EVENT, OPEN_COMPOSER_STORAGE_KEY } from "@/frontend/components/TopBar";
import { avatarColor, initials } from "@/frontend/lib/format";
import { GifPicker } from "@/frontend/components/GifPicker";
import { EmojiPicker } from "@/frontend/components/EmojiPicker";

const MAX_IMAGES = 4;

const DURATION_OPTIONS = [
  { label: "No time limit", hours: null },
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
];

interface PostComposerProps {
  onPost: (content: string, imageUrls?: string[], isGated?: boolean, videoUrl?: string) => Promise<void>;
  onCreatePoll: (question: string, options: string[], durationHours: number | null) => Promise<void>;
}

export function PostComposer({ onPost, onCreatePoll }: PostComposerProps) {
  const { authenticated, login, walletAddress } = useTwoBlockAuth();
  const { profile, remainingQuota, refresh } = useProfile();

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"image" | "video" | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [content, setContent] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [durationHours, setDurationHours] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [gated, setGated] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOg = profile?.is_og ?? false;
  const limits = getTierLimits(isOg);
  const quotaExhausted = remainingQuota !== null && remainingQuota <= 0;
  const overLimit = content.length > limits.maxPostChars;
  const filledOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
  const pollValid = content.trim().length > 0 && !overLimit && filledOptions.length >= 2;
  // Images/GIFs and video are mutually exclusive attachments (a post has
  // one or the other, never both — mirrors the media_is_exclusive DB
  // constraint in 0014_post_video.sql).
  const canAttachMoreImages = !showPoll && limits.canAttachImage && !video;
  const canAttachVideo = !showPoll && limits.canAttachVideo && images.length === 0;
  const canSubmit =
    authenticated &&
    !submitting &&
    !quotaExhausted &&
    (showPoll ? pollValid : content.trim().length > 0 && !overLimit);

  // Autofocus the textarea whenever the modal opens.
  useEffect(() => {
    if (!modalOpen) return;
    const id = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [modalOpen]);

  // Opens the composer when arriving via the TopBar's compose button —
  // either a same-page event (already on the feed) or a stashed flag
  // picked up right after navigating here from another route. Sets state
  // directly (rather than calling openComposer, defined further below)
  // since it only needs setError/setModalOpen, both already available
  // from useState above — this avoids referencing a function that hasn't
  // finished initializing yet during a fast-refresh re-render.
  useEffect(() => {
    const handleOpenEvent = () => {
      setError(null);
      setModalOpen(true);
    };
    window.addEventListener(OPEN_COMPOSER_EVENT, handleOpenEvent);

    if (sessionStorage.getItem(OPEN_COMPOSER_STORAGE_KEY)) {
      sessionStorage.removeItem(OPEN_COMPOSER_STORAGE_KEY);
      handleOpenEvent();
    }

    return () => window.removeEventListener(OPEN_COMPOSER_EVENT, handleOpenEvent);
  }, []);

  // If the modal was opened via the "Photo" or "Video" shortcut, fire the
  // matching file picker as soon as the modal (and its hidden inputs) mount.
  useEffect(() => {
    if (!modalOpen || !pendingAction) return;
    if (pendingAction === "image") fileInputRef.current?.click();
    else if (pendingAction === "video") videoInputRef.current?.click();
    setPendingAction(null);
  }, [modalOpen, pendingAction]);

  // Lock background scroll while the composer modal is open.
  useEffect(() => {
    if (!modalOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [modalOpen]);

  // Esc closes the modal (unless a post is actively being submitted).
  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, submitting]);

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
                <VideoIcon size={19} />
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
    setVideo(null);
    setGated(false);
    setShowPoll(false);
  };

  const openComposer = (action?: "image" | "video") => {
    setError(null);
    setModalOpen(true);
    if (action) setPendingAction(action);
  };

  const openComposerForPoll = () => {
    setError(null);
    setModalOpen(true);
    if (!showPoll) {
      setImages([]);
      setVideo(null);
      setShowPoll(true);
    }
  };

  const closeComposer = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleTogglePoll = () => {
    if (showPoll) {
      setShowPoll(false);
    } else {
      setImages([]);
      setVideo(null);
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
      setVideo(null);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    if (images.length >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images per post.`);
      return;
    }
    setError(null);
    setImages((prev) => [...prev, gifUrl]);
    setVideo(null);
  };

  const handleVideoPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !walletAddress) return;
    setUploadingVideo(true);
    setError(null);
    try {
      const url = await uploadPostVideo(walletAddress, file);
      setVideo(url);
      setImages([]);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : "Failed to upload video.");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    // Restore focus + move the caret to just after the inserted emoji —
    // otherwise it jumps to the end of the textarea on every insert.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (showPoll) {
        await onCreatePoll(content.trim(), filledOptions, durationHours);
      } else {
        await onPost(content.trim(), images, limits.canGatePost ? gated : undefined, video ?? undefined);
      }
      resetForm();
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  };

  const avatarNode = (
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
  );

  return (
    <>
      {/* Compact trigger — mirrors LinkedIn's feed composer bar. Clicking it
          (or one of the shortcuts below) opens the full composer in a modal
          instead of posting inline. */}
      <div className="flex flex-col gap-2 border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-3">
          {avatarNode}
          <button
            type="button"
            className="flex-1 rounded-full border border-surface-border bg-transparent px-4 py-2.5 text-left text-[15px] text-ink-faint transition-colors hover:bg-surface-hover"
            onClick={() => openComposer()}
          >
            What&apos;s on your mind?
          </button>
        </div>

        {(limits.canAttachImage || limits.canAttachVideo || limits.canCreatePoll) && (
          <div className="-mx-1 flex items-center gap-1 border-t border-surface-border pt-2">
            {limits.canAttachImage && (
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-surface-hover"
                onClick={() => openComposer("image")}
              >
                <ImageIcon size={18} />
                Photo
              </button>
            )}
            {limits.canAttachVideo && (
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-surface-hover"
                onClick={() => openComposer("video")}
              >
                <VideoIcon size={18} />
                Video
              </button>
            )}
            {limits.canCreatePoll && (
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-surface-hover"
                onClick={openComposerForPoll}
              >
                <PollIcon size={18} />
                Poll
              </button>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-y-auto rounded-2xl border border-surface-border bg-surface p-4 shadow-card sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-bold text-ink">{showPoll ? "Create poll" : "Create post"}</h2>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover"
                onClick={closeComposer}
                aria-label="Close"
                disabled={submitting}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="flex gap-3">
              {avatarNode}

              <div className="min-w-0 flex-1">
                <textarea
                  ref={textareaRef}
                  data-composer-textarea
                  className="w-full resize-none bg-transparent text-[17px] leading-snug text-ink placeholder:text-ink-faint outline-none"
                  placeholder={showPoll ? "Ask a poll question…" : "What's on your mind?"}
                  value={content}
                  onChange={(e) => {
                    const value = e.target.value;
                    const lines = value.split("\n");
                    const MAX_CONTENT_LINES = 30;
                    setContent(lines.length > MAX_CONTENT_LINES ? lines.slice(0, MAX_CONTENT_LINES).join("\n") : value);
                  }}
                  rows={showPoll ? 2 : 4}
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
                      <div
                        key={url}
                        className={`group relative flex items-center justify-center overflow-hidden bg-surface-soft ${
                          images.length === 1 ? "max-h-80" : "aspect-square"
                        }`}
                      >
                        <img src={url} alt="" className="h-full w-full object-contain" />
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

                {!showPoll && limits.canAttachVideo && video && (
                  <div className="group relative mt-1 mb-3 overflow-hidden rounded-2xl">
                    <video src={video} controls className="max-h-80 w-full bg-black" />
                    <button
                      type="button"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-90 transition-opacity hover:opacity-100"
                      onClick={() => setVideo(null)}
                    >
                      <XIcon size={13} />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={handleImagePick}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  style={{ display: "none" }}
                  onChange={handleVideoPick}
                />

                <div className="flex items-center justify-between border-t border-surface-border pt-2.5">
                  <div className="-ml-2 flex items-center gap-0.5">
                    {canAttachMoreImages && images.length === 0 && (
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-brand-blue transition-colors hover:bg-brand-blue/10 disabled:opacity-40"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        title="Add image (max 1MB)"
                      >
                        {uploadingImage ? <span className="text-[12px]">…</span> : <ImageIcon size={19} />}
                      </button>
                    )}
                    {canAttachMoreImages && images.length === 0 && (
                      <GifPicker onSelect={handleGifSelect} disabled={uploadingImage} />
                    )}
                    {canAttachVideo && !video && (
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-brand-blue transition-colors hover:bg-brand-blue/10 disabled:opacity-40"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={uploadingVideo}
                        title="Add video (max 2MB)"
                      >
                        {uploadingVideo ? <span className="text-[12px]">…</span> : <VideoIcon size={19} />}
                      </button>
                    )}
                    {limits.canCreatePoll && images.length === 0 && !video && (
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
                    <EmojiPicker onSelect={handleEmojiSelect} />
                    {limits.canGatePost && !showPoll && (
                      <button
                        type="button"
                        className={`ml-1 flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors ${
                          gated ? "bg-brand-blue/10 text-brand-blue" : "text-ink-faint hover:bg-surface-hover hover:text-ink-muted"
                        }`}
                        onClick={() => setGated((g) => !g)}
                        title="Only your followers will be able to see this post"
                      >
                        {gated ? "Followers only" : "Gate to followers"}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {overLimit && (
                      <span className="text-[12px] font-semibold text-danger">
                        {content.length}/{limits.maxPostChars}
                      </span>
                    )}
                    {remainingQuota !== null && (
                      <span
                        className={`hidden rounded-full px-2.5 py-1 text-[12px] font-medium sm:inline ${
                          quotaExhausted ? "bg-danger/10 text-danger" : "bg-surface-soft text-ink-muted"
                        }`}
                      >
                        {remainingQuota}/{limits.dailyPostLimit}
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
                  <p className={`mt-1.5 text-[12px] sm:hidden ${quotaExhausted ? "font-semibold text-danger" : "text-ink-faint"}`}>
                    {remainingQuota}/{limits.dailyPostLimit}
                  </p>
                )}
                {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
