import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Eko-Akort | Akıllı Tasarruf Platformu",
  description: "Su ve enerji tasarrufu yap, puan kazan, ödüller kazan!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gradient-to-br from-green-50 to-blue-50 min-h-screen`}
        suppressHydrationWarning
      >
        <Header />
        <main className="container mx-auto px-4 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}