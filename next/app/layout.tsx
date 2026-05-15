import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medication Tracker",
  description: "A simple calendar for tracking medication",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16191f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <InstallPrompt />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
