import prisma from "@/lib/prisma";
import ResourceClient from "@/features/resources/components/ResourceClient";

export default async function ResourcesPage() {
    const subjects = await prisma.subject.findMany({
        orderBy: { name: 'asc' }
    });

    const resources = await prisma.resource.findMany({
        include: { subject: true },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="min-h-screen bg-[#FAFAF7] text-stone-800 font-sans px-4">
            <div className="max-w-6xl mx-auto py-8">
                <header className="mb-8">
                    <p className="text-[11px] font-black tracking-[0.2em] uppercase text-stone-400 mb-1">
                        TCAS 70 · Resources
                    </p>
                    <h1 className="text-3xl font-black tracking-tight leading-none text-stone-800">คลังแสง</h1>
                    <p className="text-sm text-stone-400 mt-2 font-medium">รวบรวมคลิปติว ชีทสรุป และโน้ตสำคัญ แยกตามรายวิชา</p>
                </header>

                <ResourceClient subjects={subjects} resources={resources} />
            </div>
        </div>
    );
}