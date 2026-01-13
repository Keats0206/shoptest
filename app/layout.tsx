import type { Metadata } from "next";
import { Averia_Serif_Libre } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FeedbackButton from "@/components/FeedbackButton";
import { AuthProvider } from "@/components/AuthProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const averiaSerif = Averia_Serif_Libre({
  variable: "--font-averia-serif",
  weight: ["300", "400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopPal - Personal Styling, Minus the Bullshit",
  description: "Get your personal styling box instantly—without the box, the wait, or the $20 fee. AI generates complete, cohesive outfit drops in 2 minutes based on your style quiz. Get 12 personalized pieces you can buy anywhere (or nowhere), immediately.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${averiaSerif.variable} font-serif antialiased flex flex-col min-h-screen`}
      >
        <AuthProvider>
          <Navigation />
          <main className="flex-1">{children}</main>
          <Footer />
          <FeedbackButton />
          <Analytics />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
