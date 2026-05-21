'use client'
import { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isBetween from "dayjs/plugin/isBetween";
import { addActionLogToDB, createStudySession, finishStudySession, getCurrentSessionState } from "@/app/actions/study";
import { uploadImageToDrive } from "@/app/actions/drive";
import buddhistEra from 'dayjs/plugin/buddhistEra';
import 'dayjs/locale/th';

dayjs.extend(buddhistEra);
dayjs.locale('th');
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

type Schedule = {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    type: string;
    dayOfWeek: number;
};

type Props = {
    allSchedules: Schedule[];
    initialTime: string;
    initialDow: number;
    initialMinutes: number;
    initialCurrentScheduleId: number | null;
    initialCanEnd: boolean;
    initialStatus: "IDLE" | "STUDYING" | "PAUSED";
};

type NoteImageData = {
    file: File;
    preview: string;
    caption: string;
};

const DAY_NAMES_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const DAY_FULL_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const formatTo12Hour = (time24: string) => {
    if (!time24) return "";
    return dayjs(time24, "HH:mm").format("h:mm A");
};

const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
};

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    'ติว':      { bg: "bg-blue-50",    text: "text-blue-600",    dot: "bg-blue-400",    border: "border-blue-200" },
    'เวลาว่าง': { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400", border: "border-emerald-200" },
    'ลองสอบ':  { bg: "bg-violet-50",  text: "text-violet-600",  dot: "bg-violet-400",  border: "border-violet-200" },
    'อื่น ๆ':   { bg: "bg-orange-50",  text: "text-orange-600",  dot: "bg-orange-400",  border: "border-orange-200" },
    'DEFAULT':  { bg: "bg-stone-100",  text: "text-stone-500",   dot: "bg-stone-400",   border: "border-stone-200" },
};

const getTypeColor = (type: string) => TYPE_COLORS[type] ?? TYPE_COLORS.DEFAULT;

const getSecondsRemaining = (endTime: string): number => {
    const now = dayjs();
    const [endH, endM] = endTime.split(":").map(Number);
    const end = dayjs().hour(endH).minute(endM).second(0);
    return end.diff(now, "second");
};

const formatCountdown = (totalSeconds: number) => {
    const isOver = totalSeconds <= 0;
    const abs = Math.abs(totalSeconds);
    const h = String(Math.floor(abs / 3600)).padStart(2, "0");
    const m = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
    const s = String(abs % 60).padStart(2, "0");
    return { h, m, s, isOver };
};

/* ── Radial countdown ring ── */
function CountdownRing({
    secondsRemaining,
    totalSeconds,
    isOver,
    isPaused,
}: {
    secondsRemaining: number;
    totalSeconds: number;
    isOver: boolean;
    isPaused: boolean;
}) {
    const size = 64;
    const stroke = 5;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsRemaining / totalSeconds)) : 0;
    const dash = pct * circ;
    const color = isOver ? "#f43f5e" : isPaused ? "#fb923c" : "#10b981";
    const trackColor = isOver ? "#ffe4e6" : isPaused ? "#ffedd5" : "#d1fae5";
    return (
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
            <circle
                cx={size/2} cy={size/2} r={r}
                fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{ transition: "stroke-dasharray 0.8s linear" }}
            />
        </svg>
    );
}

export default function HeroSection({
    allSchedules,
    initialTime,
    initialDow,
    initialMinutes,
    initialCurrentScheduleId,
    initialCanEnd,
    initialStatus,
}: Props) {
    const [currentTime, setCurrentTime] = useState(initialTime);
    const [nowDow, setNowDow] = useState<number>(initialDow);
    const [nowMinutes, setNowMinutes] = useState(initialMinutes);
    const [status, setStatus] = useState<"IDLE" | "STUDYING" | "PAUSED">(initialStatus);
    const [isSaving, setIsSaving] = useState(false);
    const [canEndSession, setCanEndSession] = useState(initialCanEnd);

    const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
        const sched = allSchedules.find(s => s.id === initialCurrentScheduleId) ?? null;
        return sched ? getSecondsRemaining(sched.endTime) : 0;
    });

    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteModalVisible, setNoteModalVisible] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [selectedDay, setSelectedDay] = useState<number>(initialDow);
    const [noteError, setNoteError] = useState(false);
    const [images, setImages] = useState<NoteImageData[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getCurrentSchedule = useCallback((dow: number, mins: number) => {
        return allSchedules.find(s =>
            s.dayOfWeek === dow &&
            timeToMinutes(s.startTime) <= mins &&
            timeToMinutes(s.endTime) >= mins
        ) ?? null;
    }, [allSchedules]);

    const getPrevSchedule = useCallback((dow: number, mins: number) => {
        const todayPrev = allSchedules
            .filter(s => s.dayOfWeek === dow && timeToMinutes(s.endTime) < mins)
            .sort((a, b) => timeToMinutes(b.endTime) - timeToMinutes(a.endTime))[0];
        if (todayPrev) return todayPrev;
        for (let i = 1; i <= 7; i++) {
            const d = ((dow - i) + 7) % 7;
            const last = allSchedules
                .filter(s => s.dayOfWeek === d)
                .sort((a, b) => timeToMinutes(b.endTime) - timeToMinutes(a.endTime))[0];
            if (last) return last;
        }
        return null;
    }, [allSchedules]);

    const getNextSchedule = useCallback((dow: number, mins: number) => {
        const todayNext = allSchedules
            .filter(s => s.dayOfWeek === dow && timeToMinutes(s.startTime) > mins)
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0];
        if (todayNext) return todayNext;
        for (let i = 1; i <= 7; i++) {
            const d = (dow + i) % 7;
            const first = allSchedules
                .filter(s => s.dayOfWeek === d)
                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0];
            if (first) return { ...first, _offsetDays: i };
        }
        return null;
    }, [allSchedules]);

    const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(() =>
        allSchedules.find(s => s.id === initialCurrentScheduleId) ?? null
    );

    useEffect(() => {
        const interval = setInterval(async () => {
            const serverStatus = await getCurrentSessionState();
            setStatus(cur => serverStatus !== cur ? serverStatus : cur);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = dayjs();
            setCurrentTime(now.format("h:mm:ss A"));
            const dow = now.day();
            const mins = timeToMinutes(now.format("HH:mm"));
            setNowDow(dow);
            setNowMinutes(mins);

            setCurrentSchedule(current => {
                if (status !== "IDLE" && current) {
                    const secs = getSecondsRemaining(current.endTime);
                    setSecondsRemaining(secs);
                    setCanEndSession(secs <= 0);
                    return current;
                }
                const live = getCurrentSchedule(dow, mins);
                if (live) {
                    const secs = getSecondsRemaining(live.endTime);
                    setSecondsRemaining(secs);
                    setCanEndSession(secs <= 0);
                } else {
                    setSecondsRemaining(0);
                    setCanEndSession(false);
                }
                return live;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [getCurrentSchedule, status]);

    const getTimeUntilNextSchedule = () => {
        if (!nextSchedule) return null;
        const now = dayjs();
        let target = dayjs()
            .day(nextSchedule.dayOfWeek)
            .hour(Number(nextSchedule.startTime.split(":")[0]))
            .minute(Number(nextSchedule.startTime.split(":")[1]))
            .second(0);
        if (nextSchedule._offsetDays) target = target.add(nextSchedule._offsetDays, "day");
        const diffSeconds = target.diff(now, "second");
        if (diffSeconds <= 0) return "กำลังจะเริ่ม";
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;
        if (hours > 0) return `อีก ${hours} ชม. ${minutes} น. ${seconds} วิ`;
        if (minutes > 0) return `อีก ${minutes} น. ${seconds} วิ`;
        return `อีก ${seconds} วิ`;
    };

    const prevSchedule = getPrevSchedule(nowDow, nowMinutes);
    const nextSchedule = getNextSchedule(nowDow, nowMinutes) as (Schedule & { _offsetDays?: number }) | null;
    const nextScheduleCountdown = getTimeUntilNextSchedule();
    const daySchedules = allSchedules
        .filter(s => s.dayOfWeek === selectedDay)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const handleStartStudy = async () => {
        if (!currentSchedule?.id) return;
        const res = await createStudySession({ scheduleId: currentSchedule.id });
        if (res.success) setStatus("STUDYING");
    };

    const handleEndSession = async () => {
        setIsSaving(true);
        if (status === "IDLE" && currentSchedule?.id) {
            await createStudySession({ scheduleId: currentSchedule.id });
        }
        await addActionLogToDB("END_SESSION");
        const res = await finishStudySession();
        setIsSaving(false);
        if (res.success || status === "IDLE") {
            const now = dayjs();
            const dow = now.day();
            const mins = timeToMinutes(now.format("HH:mm"));
            setStatus("IDLE");
            setCurrentSchedule(getCurrentSchedule(dow, mins));
            setNowDow(dow);
            setNowMinutes(mins);
        }
    };

    const todayLabel = (dow: number) => {
        if (dow === nowDow) return "วันนี้";
        if (dow === (nowDow + 1) % 7) return "พรุ่งนี้";
        return DAY_FULL_TH[dow];
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setImages(prev => [...prev, ...files.map(file => ({
                file,
                preview: URL.createObjectURL(file),
                caption: ""
            }))]);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveImage = (i: number) => {
        setImages(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[i].preview);
            updated.splice(i, 1);
            return updated;
        });
    };

    const handleCaptionChange = (i: number, caption: string) => {
        setImages(prev => { const u = [...prev]; u[i].caption = caption; return u; });
    };

    const resetNoteModal = () => {
        setNoteModalVisible(false);
        setTimeout(() => {
            setNoteText(""); setNoteError(false);
            images.forEach(img => URL.revokeObjectURL(img.preview));
            setImages([]); setShowNoteModal(false);
        }, 250);
    };

    const countdown = formatCountdown(secondsRemaining);
    const isActiveSession = status === "STUDYING" || status === "PAUSED";
    const totalSessionSeconds = currentSchedule
        ? (timeToMinutes(currentSchedule.endTime) - timeToMinutes(currentSchedule.startTime)) * 60
        : 0;

    const statusConfig = {
        IDLE:     { label: "ว่าง",         dot: "bg-stone-400",   pill: "bg-stone-100 text-stone-500 border-stone-200" },
        STUDYING: { label: "กำลังเรียน",   dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        PAUSED:   { label: "พักเบรก",      dot: "bg-orange-400",  pill: "bg-orange-50 text-orange-600 border-orange-200" },
    };
    const sc = statusConfig[status];

    return (
        <div className="min-h-screen bg-[#FAFAF7] text-stone-800 px-4 py-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-4">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-stone-400 mb-1">TCAS 70 · Planner</p>
                        <p className="text-3xl md:text-5xl font-mono font-black text-stone-800 tabular-nums tracking-tight leading-none" suppressHydrationWarning>
                            {currentTime}
                        </p>
                        <p className="text-sm text-stone-400 mt-2 font-medium" suppressHydrationWarning>
                            {DAY_FULL_TH[nowDow]}ที่ {dayjs().format("D MMMM BBBB")}
                        </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mt-1 ${sc.pill}`}>
                        <span className={`w-2 h-2 rounded-full ${sc.dot} ${status !== "IDLE" ? "animate-pulse" : ""}`} />
                        {sc.label}
                    </div>
                </div>

                {/* Current Schedule Card */}
                {currentSchedule ? (
                    <div className="rounded-3xl bg-white shadow-[0_2px_24px_rgba(0,0,0,0.07)] border border-stone-100 overflow-hidden">
                        <div className={`h-1.5 w-full ${
                            status === "STUDYING" ? "bg-linear-to-r from-emerald-400 to-teal-300" :
                            status === "PAUSED"   ? "bg-linear-to-r from-orange-400 to-amber-300" :
                                                   "bg-linear-to-r from-stone-200 to-stone-100"
                        }`} />
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-1">
                                <span className="text-[10px] font-black tracking-[0.18em] uppercase text-emerald-600">ชั่วโมงนี้</span>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getTypeColor(currentSchedule.type).bg} ${getTypeColor(currentSchedule.type).text} ${getTypeColor(currentSchedule.type).border}`}>
                                    {currentSchedule.type}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-stone-800 mt-1 mb-4 leading-tight">{currentSchedule.title}</h2>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-stone-50 border border-stone-200 text-stone-600 text-sm font-mono px-3 py-1.5 rounded-xl">
                                    {formatTo12Hour(currentSchedule.startTime)}
                                </span>
                                <span className="text-stone-300 font-light">—</span>
                                <span className="bg-stone-50 border border-stone-200 text-stone-600 text-sm font-mono px-3 py-1.5 rounded-xl">
                                    {formatTo12Hour(currentSchedule.endTime)}
                                </span>
                            </div>

                            {/* Countdown block */}
                            {isActiveSession && (
                                <div className={`mb-5 rounded-2xl px-5 py-4 border flex items-center justify-between gap-4 ${
                                    countdown.isOver ? "bg-rose-50 border-rose-200" :
                                    status === "PAUSED" ? "bg-orange-50 border-orange-200" :
                                    "bg-emerald-50 border-emerald-200"
                                }`}>
                                    <div>
                                        <p className={`text-[10px] font-black tracking-widest uppercase mb-1.5 ${
                                            countdown.isOver ? "text-rose-400" :
                                            status === "PAUSED" ? "text-orange-400" : "text-emerald-500"
                                        }`}>
                                            {countdown.isOver ? "เลยเวลาแล้ว" : status === "PAUSED" ? "หยุดชั่วคราว" : "เวลาที่เหลือ"}
                                        </p>
                                        <p suppressHydrationWarning className={`text-3xl font-mono font-black tabular-nums tracking-tight leading-none ${
                                            countdown.isOver ? "text-rose-600" :
                                            status === "PAUSED" ? "text-orange-500" : "text-emerald-700"
                                        }`}>
                                            {countdown.h !== "00" && (
                                                <>{countdown.h}<span className="text-base font-bold opacity-50 mx-0.5">ชม</span></>
                                            )}
                                            {countdown.m}<span className="text-base font-bold opacity-50 mx-0.5">น</span>
                                            {countdown.s}<span className="text-base font-bold opacity-50 ml-0.5">วิ</span>
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        <CountdownRing
                                            secondsRemaining={secondsRemaining}
                                            totalSeconds={totalSessionSeconds}
                                            isOver={countdown.isOver}
                                            isPaused={status === "PAUSED"}
                                        />
                                    </div>
                                </div>
                            )}

                            {status === "IDLE" && currentSchedule.type === "ติว" ? (
                                <button
                                    onClick={handleStartStudy}
                                    className="cursor-pointer w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white font-black py-3.5 rounded-2xl text-base transition-all shadow-[0_4px_16px_rgba(5,150,105,0.3)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.4)]"
                                >
                                    เริ่มติวเลย →
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className={`flex justify-between items-center px-4 py-3 rounded-2xl border text-sm ${
                                        status === "STUDYING" ? "border-emerald-200 bg-emerald-50" :
                                        status === "PAUSED"   ? "border-orange-200 bg-orange-50" :
                                                               "border-stone-200 bg-stone-50"
                                    }`}>
                                        <div className="flex items-center gap-2.5">
                                            {status !== "IDLE" && (
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${status === "STUDYING" ? "bg-emerald-400" : "bg-orange-400"}`} />
                                                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status === "STUDYING" ? "bg-emerald-500" : "bg-orange-400"}`} />
                                                </span>
                                            )}
                                            <span className={`font-semibold text-sm ${
                                                status === "IDLE" ? "text-stone-500" :
                                                status === "STUDYING" ? "text-emerald-700" : "text-orange-600"
                                            }`}>
                                                {status === "IDLE" ? `คาบ${currentSchedule.type}` :
                                                 status === "STUDYING" ? "กำลังเรียนอยู่" : "พักเบรก"}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setShowNoteModal(true); requestAnimationFrame(() => setNoteModalVisible(true)); }}
                                                className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors border border-blue-200"
                                            >จดโน้ต</button>
                                            {status !== "IDLE" && (
                                                <button
                                                    onClick={() => {
                                                        const next = status === "STUDYING" ? "PAUSED" : "STUDYING";
                                                        setStatus(next);
                                                        addActionLogToDB(next === "STUDYING" ? "RESUME" : "PAUSE");
                                                    }}
                                                    className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors border border-stone-200"
                                                >
                                                    {status === "STUDYING" ? "พัก" : "เรียนต่อ"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleEndSession}
                                        disabled={!canEndSession || isSaving}
                                        className={`w-full py-3 rounded-2xl text-sm font-bold transition-all border ${
                                            canEndSession && !isSaving
                                                ? "cursor-pointer border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-[0_4px_16px_rgba(244,63,94,0.25)]"
                                                : "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-300"
                                        }`}
                                    >
                                        {isSaving ? "กำลังบันทึก..." :
                                         canEndSession ? (status === "IDLE" ? "จบคาบ" : "จบชั่วโมงการเรียน") :
                                         `ยังไม่ถึงเวลาจบ · ${formatTo12Hour(currentSchedule.endTime)}`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-3xl bg-white shadow-[0_2px_24px_rgba(0,0,0,0.06)] border border-stone-100 p-10 text-center">
                        <div className="text-5xl mb-3">☕</div>
                        <h2 className="text-xl font-black text-stone-700 mb-1">เวลาพักผ่อน</h2>
                        <p className="text-sm text-stone-400">ขณะนี้ไม่มีตารางติว</p>
                    </div>
                )}

                {/* Prev / Next strip */}
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: "◂ ก่อนหน้า", schedule: prevSchedule, isNext: false },
                        { label: "ถัดไป ▸",    schedule: nextSchedule,  isNext: true  },
                    ].map(({ label, schedule, isNext }) => (
                        <div key={label} className="rounded-2xl bg-white border border-stone-100 shadow-[0_1px_12px_rgba(0,0,0,0.05)] p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">{label}</p>
                            {schedule ? (
                                <>
                                    <p className="text-sm font-bold text-stone-700 leading-tight">{schedule.title}</p>
                                    <p className="text-xs text-stone-400 mt-1 font-mono">
                                        {isNext && (schedule as Schedule & { _offsetDays?: number })._offsetDays
                                            ? `${todayLabel((nowDow + ((schedule as Schedule & { _offsetDays?: number })._offsetDays ?? 0)) % 7)} `
                                            : !isNext ? `${DAY_NAMES_TH[schedule.dayOfWeek]} ` : ""}
                                        {formatTo12Hour(schedule.startTime)}–{formatTo12Hour(schedule.endTime)}
                                    </p>
                                    {isNext && nextScheduleCountdown && (
                                        <p suppressHydrationWarning className="text-[11px] text-emerald-600 font-semibold mt-1">{nextScheduleCountdown}</p>
                                    )}
                                    <span className={`mt-2.5 inline-block text-xs px-2 py-0.5 rounded-full font-semibold border ${getTypeColor(schedule.type).bg} ${getTypeColor(schedule.type).text} ${getTypeColor(schedule.type).border}`}>
                                        {schedule.type}
                                    </span>
                                </>
                            ) : (
                                <p className="text-xs text-stone-300">ไม่มีข้อมูล</p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Weekly calendar */}
                <div className="rounded-3xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-stone-100 overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-stone-100">
                        {WEEK_ORDER.map(d => {
                            const hasClass = allSchedules.some(s => s.dayOfWeek === d);
                            const isToday = d === nowDow;
                            const isSelected = d === selectedDay;
                            return (
                                <button key={d} onClick={() => setSelectedDay(d)}
                                    className={`cursor-pointer py-3.5 text-center transition-all relative ${isSelected ? "bg-stone-50" : "hover:bg-stone-50/70"}`}
                                >
                                    <p className={`text-xs font-bold ${isToday ? "text-emerald-600" : isSelected ? "text-stone-700" : "text-stone-400"}`}>
                                        {DAY_NAMES_TH[d]}
                                    </p>
                                    {hasClass && <div className={`mx-auto mt-1.5 w-1.5 h-1.5 rounded-full ${isToday ? "bg-emerald-400" : "bg-stone-300"}`} />}
                                    {isSelected && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-stone-800 rounded-full" />}
                                </button>
                            );
                        })}
                    </div>
                    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                        <p className="text-sm font-black text-stone-700">{todayLabel(selectedDay)}</p>
                        <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full font-medium">{daySchedules.length} คาบ</span>
                    </div>
                    <div className="px-4 pb-4 space-y-2">
                        {daySchedules.length === 0 ? (
                            <div className="text-center py-8"><p className="text-sm text-stone-300 font-medium">ไม่มีตารางเรียน</p></div>
                        ) : daySchedules.map(s => {
                            const isNow = s.dayOfWeek === nowDow &&
                                timeToMinutes(s.startTime) <= nowMinutes && timeToMinutes(s.endTime) >= nowMinutes;
                            const isPast = s.dayOfWeek === nowDow
                                ? timeToMinutes(s.endTime) < nowMinutes : s.dayOfWeek < nowDow;
                            const colors = getTypeColor(s.type);
                            return (
                                <div key={s.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                                    isNow ? "border-emerald-200 bg-emerald-50 shadow-[0_2px_12px_rgba(5,150,105,0.08)]" :
                                    isPast ? "border-stone-100 bg-transparent opacity-40" :
                                    "border-stone-100 bg-stone-50/60 hover:bg-stone-50"
                                }`}>
                                    <div className={`w-1 self-stretch rounded-full ${isNow ? "bg-emerald-400" : colors.dot}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${isPast && !isNow ? "text-stone-400" : "text-stone-700"}`}>{s.title}</p>
                                        <p className="text-xs text-stone-400 font-mono mt-0.5">{formatTo12Hour(s.startTime)} – {formatTo12Hour(s.endTime)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>{s.type}</span>
                                        {isNow && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold shadow-sm">ตอนนี้</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Note Modal */}
            {showNoteModal && (
                <div
                    onClick={resetNoteModal}
                    className={`fixed inset-0 z-50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 transition-all duration-300 ${
                        noteModalVisible ? "bg-black/20 opacity-100" : "bg-black/0 opacity-0"
                    }`}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className={`w-full max-w-2xl overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.15)] transition-all duration-300 ${
                            noteModalVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-95 opacity-0"
                        }`}
                    >
                        <div className="h-1.5 w-full bg-linear-to-r from-blue-400 via-violet-400 to-pink-400" />
                        <div className="flex items-start justify-between px-6 pt-5 pb-5 border-b border-stone-100">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-base">📝</div>
                                    <h3 className="text-lg font-black text-stone-800">จดบันทึกระหว่างเรียน</h3>
                                </div>
                                <p className="text-sm text-stone-400 mt-2 ml-10.5">บันทึกสูตร จุดที่ยังไม่เข้าใจ หรือสิ่งที่ต้องทบทวน</p>
                            </div>
                            <button onClick={resetNoteModal} className="cursor-pointer shrink-0 w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center text-sm font-bold">✕</button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <textarea
                                    value={noteText}
                                    onChange={e => { setNoteText(e.target.value); if (noteError) setNoteError(false); }}
                                    placeholder="สูตรที่ลืม, จุดที่ยังไม่เข้าใจ, สิ่งที่ต้องทบทวน..."
                                    className={`w-full min-h-36 bg-stone-50 text-stone-800 text-sm leading-relaxed rounded-2xl border px-4 py-3.5 outline-none resize-none transition-all placeholder:text-stone-300 ${
                                        noteError ? "border-rose-300 focus:border-rose-400 bg-rose-50/50" :
                                        "border-stone-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                                    }`}
                                    autoFocus
                                />
                                <p className="text-[11px] text-stone-300 mt-1.5 text-right font-mono">{noteText.length}/1000</p>
                            </div>
                            <div>
                                {/* รองรับ PNG, JPG, GIF, WebP ทั้งหมด */}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                    multiple
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-500 transition-colors"
                                >
                                    <span>📷</span>
                                    <span>แนบรูปภาพ</span>
                                    <span className="text-[11px] text-stone-400 font-normal">(PNG, JPG, GIF, WebP)</span>
                                    {images.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">{images.length}</span>
                                    )}
                                </button>
                            </div>
                            {images.length > 0 && (
                                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                                    {images.map((img, index) => (
                                        <div key={index} className="flex gap-3.5 rounded-2xl border border-stone-100 bg-stone-50 p-3">
                                            <div className="relative shrink-0">
                                                {/* ใช้ <img> แทน next/image เพราะ preview เป็น blob URL */}
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={img.preview}
                                                    alt={`Preview ${index}`}
                                                    className="w-20 h-20 rounded-xl object-cover border border-stone-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(index)}
                                                    className="cursor-pointer absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-bold flex items-center justify-center shadow transition-colors"
                                                >✕</button>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">คำอธิบาย</p>
                                                <textarea
                                                    value={img.caption}
                                                    onChange={e => handleCaptionChange(index, e.target.value)}
                                                    placeholder="เช่น สรุปสูตรหน้า 12..."
                                                    rows={3}
                                                    className="w-full bg-transparent text-sm text-stone-700 placeholder:text-stone-300 outline-none resize-none leading-relaxed"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {noteError && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                                    <p className="text-sm text-rose-500 font-semibold">⚠️ กรุณากรอกข้อความหรือแนบรูปภาพก่อนบันทึก</p>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 px-6 pb-6 pt-1">
                            <button type="button" onClick={resetNoteModal} disabled={isUploading}
                                className="cursor-pointer h-12 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-sm font-bold text-stone-500 transition-all disabled:opacity-50"
                            >ยกเลิก</button>
                            <button
                                onClick={async () => {
                                    if (!noteText.trim() && images.length === 0) { setNoteError(true); return; }
                                    setIsUploading(true);
                                    let uploadedImages: { url: string; caption: string }[] = [];
                                    if (images.length > 0) {
                                        const results = await Promise.all(images.map(async img => {
                                            const formData = new FormData();
                                            formData.append("file", img.file);
                                            const res = await uploadImageToDrive(formData);
                                            return res.success ? { url: res.url as string, caption: img.caption } : null;
                                        }));
                                        uploadedImages = results.filter((r): r is { url: string; caption: string } => r !== null);
                                    }
                                    if (status === "IDLE" && currentSchedule?.id) {
                                        await createStudySession({ scheduleId: currentSchedule.id });
                                        setStatus("STUDYING");
                                    }
                                    await addActionLogToDB("TAKE_NOTE", noteText, uploadedImages);
                                    setIsUploading(false);
                                    resetNoteModal();
                                }}
                                disabled={isUploading}
                                className="cursor-pointer h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-black shadow-[0_4px_16px_rgba(5,150,105,0.3)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isUploading ? `กำลังอัปโหลด ${images.length} รูป...` : "บันทึก"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}