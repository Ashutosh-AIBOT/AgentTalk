import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Assistant",
  description: "Talk to an AI voice assistant in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0d] text-[#f2f1ee] antialiased">{children}</body>
    </html>
  );
}
