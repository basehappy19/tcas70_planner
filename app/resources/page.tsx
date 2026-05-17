import prisma from "@/lib/prisma";
import ResourceClient from "./ResourceClient";

export default async function ResourcesPage() {
    const subjects = await prisma.subject.findMany({
        orderBy: { name: 'asc' }
    });

    const resources = await prisma.resource.findMany({
        include: { subject: true },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-black mb-2 tracking-tight">คลังแสง</h1>
                    <p className="text-neutral-400">รวบรวมคลิปติว ชีทสรุป และโน้ตสำคัญ แยกตามรายวิชา</p>
                </header>

                <ResourceClient subjects={subjects} resources={resources} />
            </div>
        </div>
    );
}