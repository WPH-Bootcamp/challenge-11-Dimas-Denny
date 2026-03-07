import { MusicPlayer } from "@/components/MusicPlayer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05070C] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <MusicPlayer />
      </div>
    </main>
  );
}
