import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/app/providers";
import { Sidebar } from "@/frontend/components/Sidebar";
import { RightPanel } from "@/frontend/components/RightPanel";
import { TopBar } from "@/frontend/components/TopBar";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TwoBlock",
  description: "TwoBlock — MetaMask + Arc + Supabase social network",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${fraunces.variable} ${jetBrainsMono.variable}`}>
      <head>
        {}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('twoblock-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>
          <div className="mx-auto flex min-h-screen w-full max-w-[1600px] items-start justify-center md:grid md:grid-cols-[76px_minmax(0,630px)] lg:grid-cols-[248px_990px]">
            <Sidebar />
            <div className="flex min-h-screen w-full flex-col">
              <TopBar />
              <div className="grid flex-1 grid-cols-1 items-start lg:grid-cols-[minmax(0,630px)_360px]">
                <main className="min-h-screen w-full border-r border-surface-border">{children}</main>
                <RightPanel />
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}