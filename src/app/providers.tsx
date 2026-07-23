"use client";

import type { ReactNode } from "react";
import { TwoBlockAuthProvider } from "@/frontend/hooks/useTwoBlockAuth";
import { ProfileProvider } from "@/frontend/hooks/useProfile";
import { ThemeProvider } from "@/frontend/hooks/useTheme";
import { ActiveChainProvider } from "@/frontend/hooks/useActiveChain";
import { OnboardingUsernameModal } from "@/frontend/components/OnboardingUsernameModal";
import { WalletConnectModal } from "@/frontend/components/WalletConnectModal";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ActiveChainProvider>
        <TwoBlockAuthProvider>
          <ProfileProvider>
            {children}
            <WalletConnectModal />
            <OnboardingUsernameModal />
          </ProfileProvider>
        </TwoBlockAuthProvider>
      </ActiveChainProvider>
    </ThemeProvider>
  );
}
