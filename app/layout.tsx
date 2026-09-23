import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuctionProvider } from "../context/auction-context";
import { Navbar } from "../components/navbar";

export const metadata: Metadata = {
  title: "Smadonnante Live - Gestione Fantacalcio",
  description: "Applicazione web in tempo reale per la gestione e il monitoraggio dell'asta del Fantacalcio per leghe a 10 squadre.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#090d16",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark h-full" style={{ colorScheme: 'dark' }}>
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white font-sans pb-16 md:pb-0">
        <AuctionProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">{children}</main>
        </AuctionProvider>
      </body>
    </html>
  );
}
