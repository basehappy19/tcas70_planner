import prisma from "@/lib/prisma";
import MockTestClient from "./MockTestClient";
import { getActiveTestState } from "../actions/mocktest"; // 🌟 Import เพิ่ม

export default async function MockTestPage() {
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

    const history = await prisma.mockTest.findMany({
        include: { subject: true },
        orderBy: { testDate: "desc" },
    });

    const rawStats = await prisma.mockTest.groupBy({
        by: ["subjectId"],
        _min: { score: true },
        _max: { score: true },
        _avg: { score: true },
        _count: { id: true },
    });

    const stats = rawStats.map(stat => {
        const s = subjects.find(s => s.id === stat.subjectId);
        return {
            subjectId: stat.subjectId,
            subjectName: s?.name ?? "ไม่ระบุ",
            fullScore: s?.fullScore ?? 0,
            min: stat._min.score ?? 0,
            max: stat._max.score ?? 0,
            avg: stat._avg.score ?? 0,
            count: stat._count.id,
        };
    });

    const activeTest = await getActiveTestState();

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans px-4 pb-24 md:pb-0">
            <div className="max-w-6xl mx-auto py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-white tracking-tight">ระบบจำลองสอบ</h1>
                    <p className="text-neutral-500 text-sm mt-1">จับเวลา · บันทึกคะแนน · วิเคราะห์ผล</p>
                </div>
                <MockTestClient 
                    subjects={subjects} 
                    history={history} 
                    stats={stats} 
                    initialActiveTest={activeTest}
                />
            </div>
        </div>
    );
}