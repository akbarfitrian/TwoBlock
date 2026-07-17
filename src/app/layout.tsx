import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/app/providers";
import { Sidebar } from "@/components/Sidebar";
import { RightPanel } from "@/components/RightPanel";
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
          <div className="mx-auto grid min-h-screen max-w-[1280px] grid-cols-1 items-start md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[275px_minmax(0,600px)_350px]">
            <Sidebar />
            <main className="min-h-screen w-full border-x border-surface-border">{children}</main>
            <RightPanel />
          </div>
        </Providers>
      </body>
    </html>
  );
}
