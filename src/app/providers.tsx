"use client";

import type { ReactNode } from "react";
import { TwoBlockAuthProvider } from "@/hooks/useTwoBlockAuth";
import { ProfileProvider } from "@/hooks/useProfile";
import { ThemeProvider } from "@/hooks/useTheme";
import { OnboardingUsernameModal } from "@/components/OnboardingUsernameModal";
import { WalletConnectModal } from "@/components/WalletConnectModal";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TwoBlockAuthProvider>
        <ProfileProvider>
          {children}
          <WalletConnectModal />
          <OnboardingUsernameModal />
        </ProfileProvider>
      </TwoBlockAuthProvider>
    </ThemeProvider>
  );
}
