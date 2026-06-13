import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { Solution } from "@/components/landing/Solution";
import { Architecture } from "@/components/landing/Architecture";
import { Demo } from "@/components/landing/Demo";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Comparison } from "@/components/landing/Comparison";
import { Impact } from "@/components/landing/Impact";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KhataOS — AI-Powered Microbank for Bharat" },
      {
        name: "description",
        content:
          "KhataOS turns every kirana store into an AI-powered microbank with on-device AI and conversational finance for credit, trust, repayments, and collections.",
      },
      { property: "og:title", content: "KhataOS — AI-Powered Microbank for Bharat" },
      {
        property: "og:description",
        content:
          "On-device AI and conversational finance for the next 500 million Indians.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0F172A" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Architecture />
        <Demo />
        <HowItWorks />
        <Comparison />
        <Impact />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
