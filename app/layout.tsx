import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentShield AI",
  description: "Zero-trust security gateway for autonomous AI agents"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
