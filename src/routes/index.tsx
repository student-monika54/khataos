import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HeroStats } from "@/components/landing/HeroStats";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Architecture } from "@/components/landing/Architecture";
import { AgentNetwork } from "@/components/landing/AgentNetwork";
import { Demo } from "@/components/landing/Demo";
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
          "KhataOS turns every kirana store into an AI-powered microbank. On-device AI and conversational finance automating credit, trust, repayments and collections for Bharat's 13M+ kirana stores.",
      },
      { property: "og:title", content: "KhataOS — AI-Powered Microbank for Bharat" },
      {
        property: "og:description",
        content:
          "On-device AI and conversational finance for Bharat's 13M+ kirana stores.",
      },
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
        <HeroStats />
        <Problem />
        <HowItWorks />
        <Architecture />
        <AgentNetwork />
        <Demo />
        <Impact />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
