import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Birb Flip",
  description: "Gamified BIRB staking — flip the coin, stack your streak, earn Gold",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
