import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Задания кузницы",
  description: "Таск-трекер Dragon Forge / NOF Platform Hybrid",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
