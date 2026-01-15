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
  title: "StyleRun - Your Personal Stylist, Reimagined",
  description: "Discover your signature style in minutes. AI-powered personal styling that delivers complete, curated looks tailored to you—no subscription, no wait, just pure style inspiration. Get 6 outfit ideas personalized to your taste, ready to shop anywhere.",
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
