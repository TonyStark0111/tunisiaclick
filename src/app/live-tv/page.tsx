import LiveTvApp from "@/src/components/live-tv/LiveTvApp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live TV — TunisiaClick",
  description:
    "Watch free live TV channels from around the world. News, sports, movies, and more — no sign-up required.",
};

export default function LiveTvPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <LiveTvApp />
    </main>
  );
}
