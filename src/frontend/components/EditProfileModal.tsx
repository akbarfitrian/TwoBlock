"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { uploadAvatar, UploadError } from "@/frontend/lib/upload";
import { avatarColor, initials, shortenAddress } from "@/frontend/lib/format";
import { XIcon } from "@/frontend/components/icons";
import { AvatarCropModal } from "@/frontend/components/AvatarCropModal";
import type { Profile } from "@/shared/types";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const MAX_BIO_CHARS = 160;
const USERNAME_COOLDOWN_DAYS = 30;

export function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { walletAddress } = useTwoBlockAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cooldownDaysLeft = (() => {
    if (!profile.username_changed_at) return 0;
    const elapsedMs = Date.now() - new Date(profile.username_changed_at).getTime();
    const remainingMs = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - elapsedMs;
    return remainingMs > 0 ? Math.ceil(remainingMs / (24 * 60 * 60 * 1000)) : 0;
  })();
  const usernameLocked = cooldownDaysLeft > 0;

  const handleAvatarPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.type === "image/gif") {
      void uploadPickedFile(file);
      return;
    }
    setCropFile(file);
  };

  const uploadPickedFile = async (file: File) => {
    if (!walletAddress) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const url = await uploadAvatar(walletAddress, file);
      setAvatarUrl(url);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCropped = async (blob: Blob) => {
    setCropFile(null);
    const ext = blob.type === "image/png" ? "png" : "jpg";
    const croppedFile = new File([blob], `avatar.${ext}`, { type: blob.type });
    await uploadPickedFile(croppedFile);
  };

  const handleSave = async () => {
    setError(null);

    const trimmedUsername = username.trim();
    if (!USERNAME_RE.test(trimmedUsername)) {
      setError("Username must be 3-20 characters, letters/numbers/underscore only.");
      return;
    }
    if (bio.length > MAX_BIO_CHARS) {
      setError(`Bio must be at most ${MAX_BIO_CHARS} characters.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profiles/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          username: trimmedUsername,
          bio,
          avatarUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save changes.");
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-ink">Edit profile</h2>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-[16px] font-semibold text-white"
              style={{ background: avatarColor(profile.wallet_address) }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(profile.username, profile.wallet_address)
              )}
            </div>
            <div>
              <button
                type="button"
                className="rounded-full border border-surface-border px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? "Uploading…" : "Change avatar"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleAvatarPick}
              />
            </div>
          </div>

          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-muted">
            Wallet
            <input
              className="rounded-xl border border-surface-border bg-surface-soft px-3 py-2 font-mono text-[14px] text-ink-faint"
              value={shortenAddress(profile.wallet_address)}
              disabled
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-muted">
            Username
            <input
              className="rounded-xl border border-surface-border bg-transparent px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-blue/50 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-ink-faint"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              disabled={usernameLocked}
            />
            {usernameLocked && (
              <span className="text-[12px] font-normal text-ink-faint">
                You can change your username again in {cooldownDaysLeft} day{cooldownDaysLeft === 1 ? "" : "s"}.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-muted">
            Bio
            <textarea
              className="resize-none rounded-xl border border-surface-border bg-transparent px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-blue/50"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_BIO_CHARS + 10}
              rows={3}
            />
            <span className="self-end text-[12px] font-normal text-ink-faint">
              {bio.length}/{MAX_BIO_CHARS}
            </span>
          </label>

          {error && <p className="text-[13px] text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-surface-border px-5 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-bold text-accent-contrast shadow-glow disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {cropFile && (
        <AvatarCropModal file={cropFile} onCancel={() => setCropFile(null)} onCropped={handleCropped} />
      )}
    </div>
  );
}
