import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lunara Watch — Beautiful Weather & Moon Phases",
  description:
    "Lunara Watch is your elegant companion for weather forecasts, moon phases, and sky insights — blending clarity with beauty.",
  applicationName: "Lunara Watch",
  authors: [{ name: "ctrlN3rd" }],
  keywords: [
    "Lunara Watch",
    "weather app",
    "moon phases",
    "forecast",
    "sky insights",
    "climate",
  ],
  openGraph: {
    title: "Lunara Watch",
    description:
      "Track the skies beautifully — weather forecasts, moon phases, and celestial insights all in one place.",
    url: "https://lunarawatch.vercel.app", // replace with your real domain
    siteName: "Lunara Watch",
    images: [
      {
        url: "/og-image.png", // you can design one later
        width: 1200,
        height: 630,
        alt: "Lunara Watch Weather App",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lunara Watch",
    description:
      "Your elegant guide to weather, moon phases, and sky insights.",
    images: ["/og-image.png"],
    creator: "@yourhandle", // optional: your Twitter handle
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${robotoMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
