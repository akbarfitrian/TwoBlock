"use client";

import type { ReactNode } from "react";
import { TwoBlockAuthProvider } from "@/hooks/useTwoBlockAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { OnboardingUsernameModal } from "@/components/OnboardingUsernameModal";
import { WalletConnectModal } from "@/components/WalletConnectModal";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TwoBlockAuthProvider>
        {children}
        <WalletConnectModal />
        <OnboardingUsernameModal />
      </TwoBlockAuthProvider>
    </ThemeProvider>
  );
}
