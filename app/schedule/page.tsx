import prisma from "@/lib/prisma";
import ScheduleGrid from "../components/ScheduleGrid"; 

export default async function SchedulePage() {
    const allSchedules = await prisma.schedule.findMany({
        orderBy: { startTime: 'asc' }
    });

    const days = [
        { name: "จันทร์", dayIndex: 1, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
        { name: "อังคาร", dayIndex: 2, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
        { name: "พุธ", dayIndex: 3, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
        { name: "พฤหัสบดี", dayIndex: 4, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
        { name: "ศุกร์", dayIndex: 5, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        { name: "เสาร์", dayIndex: 6, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        { name: "อาทิตย์", dayIndex: 0, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    ];

    const bkkTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const currentDayIndex = bkkTime.getDay();

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-8 text-white font-sans">
            <div className="max-w-350 mx-auto">
                <header className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black mb-2 tracking-tight">ตารางติว</h1>
                        <p className="text-neutral-400">ภาพรวมภารกิจ TCAS 70 ตลอดสัปดาห์</p>
                    </div>
                </header>

                <div className="overflow-x-auto pb-8 scrollbar-hide">
                    <div className="grid grid-cols-7 gap-4 min-w-350 md:min-w-0">
                        {days.map((day) => {
                            const isToday = day.dayIndex === currentDayIndex;
                            const daySchedules = allSchedules.filter(s => s.dayOfWeek === day.dayIndex);

                            return (
                                <div 
                                    key={day.dayIndex} 
                                    className={`flex flex-col gap-4 p-3 rounded-3xl transition-colors ${
                                        isToday ? 'bg-neutral-900/80 border border-neutral-800 shadow-xl' : 'bg-transparent'
                                    }`}
                                >
                                    <div className={`py-3 px-4 rounded-2xl text-center border ${day.bg} ${day.border} ${isToday ? 'ring-2 ring-emerald-500/30' : ''}`}>
                                        <span className={`${day.color} font-bold text-sm tracking-wide`}>
                                            {isToday ? `${day.name}` : day.name}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-col gap-3">
                                        {daySchedules.length > 0 ? (
                                            daySchedules.map(item => (
                                                <ScheduleGrid key={item.id} item={item} isToday={isToday} />
                                            ))
                                        ) : (
                                            <div className="text-center py-6 border border-dashed border-neutral-800 rounded-2xl">
                                                <p className="text-xs text-neutral-600 font-medium">ไม่มีตารางเรียน</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}