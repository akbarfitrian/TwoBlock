"use client";

import { useTwoBlockAuth } from "@/hooks/useTwoBlockAuth";
import { useTheme } from "@/hooks/useTheme";
import { BackButton } from "@/components/BackButton";
import { SunIcon, MoonIcon } from "@/components/icons";

export function SettingsPage() {
  const { authenticated, login } = useTwoBlockAuth();
  const { theme, toggleTheme } = useTheme();

  if (!authenticated) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-[22px] font-bold text-ink">Settings</h1>
        </div>
        <p className="text-[14px] text-ink-muted">Connect your wallet to manage your settings.</p>
        <button
          className="w-fit rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-bold text-accent-contrast shadow-glow"
          onClick={login}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="font-display text-[22px] font-bold text-ink">Settings</h1>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-bold text-ink">Appearance</h2>
        <p className="text-[13px] text-ink-muted">Choose how TwoBlock looks on this device.</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-surface-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-hover text-ink-muted">
            {theme === "dark" ? <MoonIcon size={17} /> : <SunIcon size={17} />}
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">Dark mode</p>
            <p className="text-[13px] text-ink-muted">
              {theme === "dark" ? "On — easier on the eyes at night." : "Off — using the light appearance."}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={theme === "dark"}
          aria-label="Toggle dark mode"
          onClick={toggleTheme}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
            theme === "dark" ? "bg-brand-gradient" : "bg-surface-hover"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-card transition-transform duration-200 ${
              theme === "dark" ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
