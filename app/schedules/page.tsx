import prisma from "@/lib/prisma";
import ScheduleGrid from "../components/ScheduleGrid";
import CurrentDateTime from "./CurrentDateTime";

export default async function SchedulePage() {
    const allSchedules = await prisma.schedule.findMany({
        orderBy: { startTime: "asc" },
    });

    const days = [
        { name: "จันทร์",    short: "จ",  dayIndex: 1 },
        { name: "อังคาร",    short: "อ",  dayIndex: 2 },
        { name: "พุธ",       short: "พ",  dayIndex: 3 },
        { name: "พฤหัสบดี",  short: "พฤ", dayIndex: 4 },
        { name: "ศุกร์",     short: "ศ",  dayIndex: 5 },
        { name: "เสาร์",     short: "ส",  dayIndex: 6 },
        { name: "อาทิตย์",  short: "อา", dayIndex: 0 },
    ];

    const bkkTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const currentDayIndex = bkkTime.getDay();
    const totalSessions = allSchedules.length;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans px-4">
            <div className="max-w-6xl mx-auto py-8">

                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">ตารางติว</h1>
                        <p className="text-neutral-500 text-sm mt-1">ภาพรวมทั้งสัปดาห์ · {totalSessions} คาบ</p>
                    </div>
                    <CurrentDateTime days={days} />
                </div>

                {/* ── Desktop: 7-col grid ── */}
                <div className="hidden md:block overflow-x-auto">
                    <div className="grid grid-cols-7 gap-3 min-w-225">
                        {days.map((day) => {
                            const isToday = day.dayIndex === currentDayIndex;
                            const daySchedules = allSchedules.filter(s => s.dayOfWeek === day.dayIndex);
                            return (
                                <div key={day.dayIndex} className="flex flex-col gap-2">
                                    {/* Day header */}
                                    <div className={`text-center py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors ${
                                        isToday
                                            ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/25"
                                            : "text-neutral-600 border border-transparent"
                                    }`}>
                                        {day.name}
                                    </div>
                                    {/* Cards */}
                                    <div className="flex flex-col gap-2">
                                        {daySchedules.length > 0 ? (
                                            daySchedules.map(item => (
                                                <ScheduleGrid key={item.id} item={item} isToday={isToday} />
                                            ))
                                        ) : (
                                            <div className="border border-dashed border-neutral-800/60 rounded-xl py-8 text-center">
                                                <p className="text-[10px] text-neutral-700">—</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Mobile: stacked day sections ── */}
                <div className="md:hidden space-y-6">
                    {days.map((day) => {
                        const isToday = day.dayIndex === currentDayIndex;
                        const daySchedules = allSchedules.filter(s => s.dayOfWeek === day.dayIndex);
                        if (daySchedules.length === 0 && !isToday) return null;
                        return (
                            <div key={day.dayIndex}>
                                {/* Day label row */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                        isToday ? "bg-emerald-500 text-black" : "bg-neutral-800 text-neutral-400"
                                    }`}>
                                        {day.short}
                                    </div>
                                    <span className={`text-sm font-bold ${isToday ? "text-white" : "text-neutral-400"}`}>
                                        {day.name}
                                    </span>
                                    {isToday && (
                                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                                            วันนี้
                                        </span>
                                    )}
                                    <div className="flex-1 h-px bg-neutral-800/60" />
                                    <span className="text-[10px] text-neutral-600">{daySchedules.length} คาบ</span>
                                </div>
                                {daySchedules.length > 0 ? (
                                    <div className="space-y-2 pl-11">
                                        {daySchedules.map(item => (
                                            <ScheduleGrid key={item.id} item={item} isToday={isToday} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="pl-11">
                                        <div className="border border-dashed border-neutral-800/50 rounded-xl py-5 text-center">
                                            <p className="text-xs text-neutral-700">ไม่มีตาราง</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}