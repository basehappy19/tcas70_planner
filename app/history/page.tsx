import { getStudyHistory } from "@/features/study/services/history";
import HistoryClient from "./HistoryClient";

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: { q?: string };
}) {
    const { history } = await getStudyHistory(searchParams.q);

    return (
        <main className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-stone-800 tracking-tight">ประวัติการเรียน</h1>
                <p className="text-stone-500 font-medium">ทบทวนสิ่งที่คุณได้เรียนรู้และพัฒนาตัวเองอย่างต่อเนื่อง</p>
            </div>

            <HistoryClient initialHistory={history || []} />
        </main>
    );
}
