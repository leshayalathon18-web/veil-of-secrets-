import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "veil-of-secrets.local";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: origin,
    title: "Veil of Secrets | Blackthorn Manor",
    description:
      "Enter a candlelit social deduction mystery where every room remembers and every witness edits the truth.",
    applicationName: "Veil of Secrets",
    keywords: [
      "mystery game",
      "deduction game",
      "multiplayer mystery",
      "Blackthorn Manor",
    ],
    openGraph: {
      title: "Veil of Secrets",
      description:
        "Every room remembers. Every witness edits the truth. Enter Blackthorn Manor.",
      type: "website",
      url: origin,
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Veil of Secrets at Blackthorn Manor" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Veil of Secrets",
      description: "Enter the candlelit mystery of Blackthorn Manor.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
