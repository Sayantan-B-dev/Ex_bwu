import type { Metadata } from "next";
import ToastProvider from "@/components/ToastProvider";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "BWU - 3rd Semester Modules",
  description: "Weekly reports, print plans and lab work for the BTech 3rd semester.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-180.png",
  },
  openGraph: {
    title: "BWU - 3rd Semester Modules",
    description: "Weekly reports, print plans and lab work for the BTech 3rd semester.",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router: root layout loads the font app-wide */}
        <link href="https://fonts.googleapis.com/css2?family=Audiowide&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ToastProvider>
          <Navbar />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
