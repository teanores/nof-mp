import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Narag'Othal Forgath",
  description: "Главная платформа Narag'Othal Forgath",
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
