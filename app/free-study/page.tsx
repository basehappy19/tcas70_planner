import { getFreeStudyState } from "@/features/free-study/services/freeStudy";
import FreeStudySection from "@/features/free-study/components/FreeStudySection";

export default async function FreeStudyPage() {
  const initialSession = await getFreeStudyState();
  return (
    <main className="min-h-screen bg-[#FAFAF7] text-stone-800 font-sans px-4">
      <div className="max-w-6xl mx-auto py-8">
        <FreeStudySection initialSession={initialSession} />
      </div>
    </main>
  );
}