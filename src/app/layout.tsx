import type { Metadata, Viewport } from "next";
import { type ReactNode } from "react";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { LayoutClient } from "@/components/layout/LayoutClient";
import { ThemeProvider } from "@/components/theme-provider";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: '400',
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // C1 — theme-color so the PWA install / browser chrome matches the app.
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "Drugucopia - Dose Logger and Substance Resources",
  description: "Documentation for psychoactive substances including effects, dosages, harm reduction, with a dose logger.",
  keywords: ["psychoactive", "substances", "documentation", "harm reduction", "drug information"],
  authors: [{ name: "conflictmedia @ conflict@cocaine.ninja" }],
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.png`,
    apple: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.png`,
  },
  // C1 — Web App Manifest so the app is installable to the home screen
  // and treated as a PWA. Combined with the offline service worker
  // (C2), this lets users log doses at festivals/bars with no signal.
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    title: "Drugucopia",
    statusBarStyle: "black-translucent",
  },
  applicationName: "Drugucopia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.className} ${ibmPlexMono.className} antialiased text-base-content`}
      >
        <ThemeProvider>
          <LayoutClient>
            {children}
          </LayoutClient>
        </ThemeProvider>
      </body>
    </html>
  );
}
