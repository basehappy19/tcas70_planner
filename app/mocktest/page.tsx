import prisma from "@/lib/prisma";
import MockTestClient from "@/features/mocktest/components/MockTestClient";
import { getActiveTestState } from "@/features/mocktest/services/mocktest";

export default async function MockTestPage() {
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

    const rawHistory = await prisma.mockTest.findMany({
        where: { status: "COMPLETED" },
        include: {
            subject: true,
            actions: { include: { images: true }, orderBy: { time: "asc" } },
        },
        orderBy: { updatedAt: "desc" },
    });

    const history = rawHistory.map((test) => {
        const finishLog = test.actions.find((a) => a.action === "FINISH");
        return {
            id: test.id,
            score: test.score ?? 0,
            testDate: test.createdAt,
            notes: finishLog?.note ?? null,
            subject: test.subject,
            actions: test.actions,
            timeLimitMinutes: test.timeLimitMinutes,
            timeSpentSeconds: test.timeSpentSeconds,
        };
    });

    const statsMap = new Map<number, { min: number; max: number; sum: number; count: number }>();
    for (const h of history) {
        const sId = h.subject.id;
        if (!statsMap.has(sId)) {
            statsMap.set(sId, { min: h.score, max: h.score, sum: h.score, count: 1 });
        } else {
            const st = statsMap.get(sId)!;
            st.min = Math.min(st.min, h.score);
            st.max = Math.max(st.max, h.score);
            st.sum += h.score;
            st.count += 1;
        }
    }

    const stats = Array.from(statsMap.entries()).map(([subjectId, st]) => {
        const s = subjects.find((sub) => sub.id === subjectId);
        return {
            subjectId,
            subjectName: s?.name ?? "ไม่ระบุ",
            fullScore: s?.fullScore ?? 0,
            min: st.min,
            max: st.max,
            avg: st.sum / st.count,
            count: st.count,
        };
    });

    const activeTest = await getActiveTestState();

    return (
        <div className="min-h-screen bg-[#FAFAF7] text-stone-800 font-sans px-4">
            <div className="max-w-6xl mx-auto py-8">
                <div className="mb-8">
                    <p className="text-[11px] font-black tracking-[0.2em] uppercase text-stone-400 mb-1">
                        TCAS 70 · Mock Test
                    </p>
                    <h1 className="text-3xl font-black text-stone-800 tracking-tight leading-none">
                        ระบบจำลองสอบ
                    </h1>
                    <p className="text-sm text-stone-400 mt-2 font-medium">จับเวลา · บันทึกคะแนน · วิเคราะห์ผล</p>
                </div>
                <MockTestClient subjects={subjects} history={history} stats={stats} initialActiveTest={activeTest} />
            </div>
        </div>
    );
}