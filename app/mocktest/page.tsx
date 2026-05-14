import prisma from "@/lib/prisma";
import MockTestClient from "./MockTestClient";

export default async function MockTestPage() {
    const subjects = await prisma.subject.findMany({
        orderBy: { name: 'asc' }
    });

    // 2. ดึงประวัติการสอบทั้งหมด พร้อมข้อมูลรายวิชา
    const history = await prisma.mockTest.findMany({
        include: { 
            // Prisma มักจะแปลงชื่อ Relation เป็นตัวเล็ก
            subject: true 
        },
        orderBy: { testDate: 'desc' }
    });

    // 3. คำนวณสถิติ MIN, MAX, AVG แยกตามวิชา
    const rawStats = await prisma.mockTest.groupBy({
        by: ['subjectId'],
        _min: { score: true },
        _max: { score: true },
        _avg: { score: true },
        _count: { id: true }
    });

    // นำสถิติมาประกอบกับชื่อวิชาและคะแนนเต็ม
    const stats = rawStats.map(stat => {
        const subjectData = subjects.find(s => s.id === stat.subjectId);
        return {
            subjectId: stat.subjectId,
            subjectName: subjectData?.name || 'ไม่ระบุ',
            fullScore: subjectData?.fullScore || 0,
            min: stat._min.score || 0,
            max: stat._max.score || 0,
            avg: stat._avg.score || 0,
            count: stat._count.id
        };
    });

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-8 text-white font-sans">
            <div className="max-w-5xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-4xl font-black mb-2 tracking-tight">ระบบจำลองสอบ (Mock Test)</h1>
                    <p className="text-neutral-400">บันทึกคะแนน วิเคราะห์จุดอ่อน และดูสถิติการพัฒนาของตัวเอง</p>
                </header>

                <MockTestClient subjects={subjects} history={history} stats={stats} />
            </div>
        </div>
    );
}