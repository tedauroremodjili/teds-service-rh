import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TED'S SERVICE — ERP RH",
    // Chaque page ne definit que son propre titre ; le suffixe est ajoute ici.
    template: "%s | TED'S SERVICE",
  },
  description:
    "Application de gestion des ressources humaines, des formations et des ventes de TED'S SERVICE.",
  // Pas de champ `icons` : Next.js detecte automatiquement src/app/icon.png
  // (l'emblème du logo) et genere la balise correspondante.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
