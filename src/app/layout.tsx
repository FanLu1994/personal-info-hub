import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "信息聚合 - 个人信息流阅读器",
  description: "聚合 RSS、Linux.do、Hacker News、GitHub Trending 的个人信息阅读器",
  keywords: ["RSS", "Hacker News", "GitHub Trending", "Linux.do", "信息聚合"],
  authors: [{ name: "Personal Info Reader" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
