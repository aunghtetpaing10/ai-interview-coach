import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

const cormorantGaramond = localFont({
  variable: "--font-cormorant-garamond",
  display: "swap",
  src: [
    {
      path: "./fonts/cormorant-garamond-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/cormorant-garamond-italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/cormorant-garamond-bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

const spaceGrotesk = localFont({
  variable: "--font-space-grotesk",
  display: "swap",
  src: [
    {
      path: "./fonts/space-grotesk-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/space-grotesk-italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/space-grotesk-bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

const ibmPlexMono = localFont({
  variable: "--font-ibm-plex-mono",
  display: "swap",
  src: [
    {
      path: "./fonts/ibm-plex-mono-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-mono-bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-mono-600.ttf",
      weight: "600",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-interview-coach.vercel.app"),
  title: {
    default: "The Curator",
    template: "%s | The Curator",
  },
  description:
    "The Curator is a portfolio-grade interview intelligence workspace with grounded mock interviews, evidence-linked feedback, and coaching designed to feel editorial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
