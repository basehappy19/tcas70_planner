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
import Image from "next/image";

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
    initialStatus: "IDLE" | "STUDYING" | "PAUSED";
};

// 🌟 สร้าง Type สำหรับเก็บข้อมูลรูปภาพพร้อมคำอธิบาย
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

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    'ติว': { bg: "bg-blue-500/15", text: "text-blue-400", dot: "bg-blue-400" },
    'เวลาว่าง': { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
    'ลองสอบ': { bg: "bg-violet-500/15", text: "text-violet-400", dot: "bg-violet-400" },
    'อื่น ๆ': { bg: "bg-pink-500/15", text: "text-pink-400", dot: "bg-pink-400" },
    'DEFAULT': { bg: "bg-neutral-700/40", text: "text-neutral-300", dot: "bg-neutral-400" },
};

const getTypeColor = (type: string) => TYPE_COLORS[type?.toUpperCase()] ?? TYPE_COLORS.DEFAULT;

export default function HeroSection({ allSchedules, initialTime, initialStatus }: Props) {
    const [currentTime, setCurrentTime] = useState(initialTime);
    const [nowDow, setNowDow] = useState<number>(dayjs().day());
    const [nowMinutes, setNowMinutes] = useState(timeToMinutes(dayjs().format("HH:mm")));
    
    const [status, setStatus] = useState<"IDLE" | "STUDYING" | "PAUSED">(initialStatus);
    
    const [isSaving, setIsSaving] = useState(false);
    const [canEndSession, setCanEndSession] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [selectedDay, setSelectedDay] = useState<number>(dayjs().day());
    const [noteError, setNoteError] = useState(false);

    // 🌟 เปลี่ยนมาใช้ State แบบ Array ของ Object แทนการแยก File และ Preview
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

    const [currentSchedule, setCurrentSchedule] = useState(() => getCurrentSchedule(dayjs().day(), timeToMinutes(dayjs().format("HH:mm"))));

    useEffect(() => {
        const syncStatusInterval = setInterval(async () => {
            const serverStatus = await getCurrentSessionState();
            setStatus(currentStatus => {
                if (serverStatus !== currentStatus) {
                    return serverStatus;
                }
                return currentStatus;
            });
        }, 3000);

        return () => clearInterval(syncStatusInterval);
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
                if (
                    status !== "IDLE" &&
                    current &&
                    timeToMinutes(current.endTime) > mins
                ) {
                    return current;
                }
                return getCurrentSchedule(dow, mins);
            });

            if (currentSchedule?.endTime) {
                const [endH, endM] = currentSchedule.endTime.split(":");
                const scheduledEnd = dayjs().hour(Number(endH)).minute(Number(endM)).second(0);
                setCanEndSession(now.isSameOrAfter(scheduledEnd));
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [currentSchedule, getCurrentSchedule, status]);

    const getTimeUntilNextSchedule = () => {
        if (!nextSchedule) return null;

        const now = dayjs();
        let target = dayjs()
            .day(nextSchedule.dayOfWeek)
            .hour(Number(nextSchedule.startTime.split(":")[0]))
            .minute(Number(nextSchedule.startTime.split(":")[1]))
            .second(0);

        if (nextSchedule._offsetDays) {
            target = target.add(nextSchedule._offsetDays, "day");
        }

        const diffSeconds = target.diff(now, "second");

        if (diffSeconds <= 0) return "กำลังจะเริ่ม";

        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;

        if (hours > 0) {
            return `อีก ${hours} ชม. ${minutes} นาที ${seconds} วิ`;
        }

        if (minutes > 0) {
            return `อีก ${minutes} นาที ${seconds} วิ`;
        }

        return `อีก ${seconds} วิ`;
    };

    const prevSchedule = getPrevSchedule(nowDow, nowMinutes);
    const nextSchedule = getNextSchedule(nowDow, nowMinutes) as (Schedule & { _offsetDays?: number }) | null;
    const nextScheduleCountdown = getTimeUntilNextSchedule();
    const daySchedules = allSchedules.filter(s => s.dayOfWeek === selectedDay).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const handleStartStudy = async () => {
        if (!currentSchedule?.id) return;
        const res = await createStudySession({ scheduleId: currentSchedule.id });
        if (res.success) {
            setStatus("STUDYING");
        }
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

    // 🌟 ฟังก์ชันจัดการรูปภาพแบบใหม่
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const newImages: NoteImageData[] = files.map(file => ({
                file,
                preview: URL.createObjectURL(file),
                caption: ""
            }));
            setImages(prev => [...prev, ...newImages]);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[indexToRemove].preview);
            newImages.splice(indexToRemove, 1);
            return newImages;
        });
    };

    const handleCaptionChange = (index: number, newCaption: string) => {
        setImages(prev => {
            const newImages = [...prev];
            newImages[index].caption = newCaption;
            return newImages;
        });
    };

    const resetNoteModal = () => {
        setNoteText("");
        setNoteError(false);
        images.forEach(img => URL.revokeObjectURL(img.preview));
        setImages([]);
        setShowNoteModal(false);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-5">

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest mb-0.5">TCAS 70 Planner</p>
                        <p
                            className="text-4xl font-mono font-bold text-white tabular-nums"
                            suppressHydrationWarning
                        >
                            {currentTime}
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">
                            {DAY_FULL_TH[nowDow]}ที่ {dayjs().format("D MMMM BBBB")}
                        </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${status === "STUDYING" ? "bg-emerald-400 animate-pulse" : status === "PAUSED" ? "bg-amber-400 animate-pulse" : "bg-neutral-700"}`} />
                </div>

                {/* ── Current Schedule Card ── */}
                {currentSchedule ? (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-emerald-500 via-emerald-400 to-transparent" />
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-widest">ชั่วโมงนี้</span>
                                <h2 className="text-2xl font-black text-white mt-1">{currentSchedule.title}</h2>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getTypeColor(currentSchedule.type).bg} ${getTypeColor(currentSchedule.type).text}`}>
                                {currentSchedule.type}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-sm font-mono text-neutral-300 mb-6">
                            <span className="bg-neutral-800 px-3 py-1.5 rounded-lg">{formatTo12Hour(currentSchedule.startTime)}</span>
                            <span className="text-neutral-600">—</span>
                            <span className="bg-neutral-800 px-3 py-1.5 rounded-lg">{formatTo12Hour(currentSchedule.endTime)}</span>
                        </div>

                        {status === "IDLE" && currentSchedule.type === "ติว" ? (
                            <button
                                onClick={handleStartStudy}
                                className="cursor-pointer w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 font-black py-3.5 rounded-xl text-base transition-all"
                            >
                                เริ่มติวเลย →
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div className={`flex justify-between items-center px-4 py-3 rounded-xl border text-sm ${status === "IDLE" ? "border-neutral-700 bg-neutral-800/40" : status === "STUDYING" ? "border-emerald-500/25 bg-emerald-500/8" : "border-amber-500/25 bg-amber-500/8"}`}>
                                    <div className="flex items-center gap-2.5">
                                        {status !== "IDLE" && (
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${status === "STUDYING" ? "bg-emerald-400" : "bg-amber-400"}`} />
                                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status === "STUDYING" ? "bg-emerald-500" : "bg-amber-500"}`} />
                                            </span>
                                        )}
                                        <span className={`font-semibold ${status === "IDLE" ? "text-neutral-400" : status === "STUDYING" ? "text-emerald-400" : "text-amber-400"}`}>
                                            {status === "IDLE" ? `คาบ${currentSchedule.type}` : status === "STUDYING" ? "กำลังเรียน" : "พักเบรก"}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowNoteModal(true)}
                                            className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
                                        >
                                            จดโน้ต
                                        </button>
                                        {status !== "IDLE" && (
                                            <button
                                                onClick={() => {
                                                    const next = status === "STUDYING" ? "PAUSED" : "STUDYING";
                                                    setStatus(next);
                                                    addActionLogToDB(next === "STUDYING" ? "RESUME" : "PAUSE");
                                                }}
                                                className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors"
                                            >
                                                {status === "STUDYING" ? "พัก" : "เรียนต่อ"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleEndSession}
                                    disabled={!canEndSession || isSaving}
                                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all border ${canEndSession && !isSaving
                                        ? "cursor-pointer border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500"
                                        : "cursor-not-allowed border-neutral-800 bg-transparent text-neutral-600"
                                        }`}
                                >
                                    {isSaving ? "กำลังบันทึก..." : canEndSession ? (status === "IDLE" ? "จบคาบ" : "จบชั่วโมงการเรียน") : `ยังไม่ถึงเวลาจบ · ${formatTo12Hour(currentSchedule.endTime)}`}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
                        <div className="text-4xl mb-3">☕</div>
                        <h2 className="text-xl font-bold text-white mb-1">เวลาพักผ่อน</h2>
                        <p className="text-sm text-neutral-500">ขณะนี้ไม่มีตารางติว</p>
                    </div>
                )}

                {/* ── Prev / Next strip ── */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                        <p className="text-xs text-neutral-500 mb-2 font-medium">◂ ก่อนหน้า</p>
                        {prevSchedule ? (
                            <>
                                <p className="text-sm font-bold text-neutral-200 leading-tight">{prevSchedule.title}</p>
                                <p className="text-xs text-neutral-500 mt-1 font-mono">
                                    {DAY_NAMES_TH[prevSchedule.dayOfWeek]} {formatTo12Hour(prevSchedule.startTime)}–{formatTo12Hour(prevSchedule.endTime)}
                                </p>
                                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(prevSchedule.type).bg} ${getTypeColor(prevSchedule.type).text}`}>
                                    {prevSchedule.type}
                                </span>
                            </>
                        ) : (
                            <p className="text-xs text-neutral-600">ไม่มีข้อมูล</p>
                        )}
                    </div>
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                        <p className="text-xs text-neutral-500 mb-2 font-medium">ถัดไป ▸</p>
                        {nextSchedule ? (
                            <>
                                <p className="text-sm font-bold text-neutral-200 leading-tight">{nextSchedule.title}</p>
                                <div className="mt-1 space-y-1">
                                    <p className="text-xs text-neutral-500 font-mono">
                                        {nextSchedule._offsetDays
                                            ? `${todayLabel((nowDow + (nextSchedule._offsetDays ?? 0)) % 7)} `
                                            : ""
                                        }
                                        {formatTo12Hour(nextSchedule.startTime)}–{formatTo12Hour(nextSchedule.endTime)}
                                    </p>

                                    {nextScheduleCountdown && (
                                        <p suppressHydrationWarning className="text-[11px] text-emerald-400 font-semibold">
                                            {nextScheduleCountdown}
                                        </p>
                                    )}
                                </div>
                                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(nextSchedule.type).bg} ${getTypeColor(nextSchedule.type).text}`}>
                                    {nextSchedule.type}
                                </span>
                            </>
                        ) : (
                            <p className="text-xs text-neutral-600">ไม่มีข้อมูล</p>
                        )}
                    </div>
                </div>

                {/* ── Weekly calendar ── */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-neutral-800">
                        {WEEK_ORDER.map(d => {
                            const hasClass = allSchedules.some(s => s.dayOfWeek === d);
                            const isToday = d === nowDow;
                            const isSelected = d === selectedDay;
                            return (
                                <button
                                    key={d}
                                    onClick={() => setSelectedDay(d)}
                                    className={`cursor-pointer py-3 text-center transition-colors relative ${isSelected ? "bg-neutral-800" : "hover:bg-neutral-800/50"}`}
                                >
                                    <p className={`text-xs font-semibold ${isToday ? "text-emerald-400" : isSelected ? "text-white" : "text-neutral-500"}`}>
                                        {DAY_NAMES_TH[d]}
                                    </p>
                                    {hasClass && (
                                        <div className={`mx-auto mt-1 w-1 h-1 rounded-full ${isToday ? "bg-emerald-400" : "bg-neutral-600"}`} />
                                    )}
                                    {isSelected && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-neutral-300">{todayLabel(selectedDay)}</p>
                        <p className="text-xs text-neutral-500">{daySchedules.length} คาบ</p>
                    </div>

                    <div className="px-4 pb-4 space-y-2">
                        {daySchedules.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-sm text-neutral-600">ไม่มีตารางเรียน</p>
                            </div>
                        ) : daySchedules.map(s => {
                            const isNow = s.dayOfWeek === nowDow &&
                                timeToMinutes(s.startTime) <= nowMinutes &&
                                timeToMinutes(s.endTime) >= nowMinutes;
                            const isPast = s.dayOfWeek === nowDow
                                ? timeToMinutes(s.endTime) < nowMinutes
                                : s.dayOfWeek < nowDow;
                            const colors = getTypeColor(s.type);
                            return (
                                <div
                                    key={s.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isNow
                                        ? "border-emerald-500/30 bg-emerald-500/8"
                                        : isPast
                                            ? "border-neutral-800/50 bg-transparent opacity-40"
                                            : "border-neutral-800 bg-neutral-800/30"
                                        }`}
                                >
                                    <div className={`w-1 self-stretch rounded-full ${isNow ? "bg-emerald-400" : colors.dot}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${isPast && !isNow ? "text-neutral-500" : "text-neutral-100"}`}>
                                            {s.title}
                                        </p>
                                        <p className="text-xs text-neutral-500 font-mono mt-0.5">
                                            {formatTo12Hour(s.startTime)} – {formatTo12Hour(s.endTime)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                                            {s.type}
                                        </span>
                                        {isNow && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                                                ตอนนี้
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Note Modal ── */}
            {showNoteModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-700 p-5 rounded-2xl w-full max-w-md shadow-2xl">
                        <h3 className="text-sm font-semibold text-neutral-200 mb-3">📝 จดบันทึกระหว่างเรียน</h3>

                        <textarea
                            value={noteText}
                            onChange={e => {
                                setNoteText(e.target.value);
                                if (noteError) setNoteError(false);
                            }}
                            placeholder="สูตรที่ลืม, จุดที่ยังไม่เข้าใจ, สิ่งที่ต้องทบทวน..."
                            className={`w-full h-24 bg-neutral-950 text-white text-sm p-3.5 rounded-xl border outline-none resize-none placeholder:text-neutral-600 transition-colors ${noteError
                                ? "border-rose-500 focus:border-rose-400"
                                : "border-neutral-800 focus:border-blue-500"
                                }`}
                            autoFocus
                        />

                        {/* 🌟 แสดงรายการรูปภาพพร้อมช่องกรอกคำอธิบายแต่ละรูป */}
                        {images.length > 0 && (
                            <div className="flex flex-col gap-3 mt-3 max-h-48 overflow-y-auto pr-1">
                                {images.map((img, index) => (
                                    <div key={index} className="flex gap-3 items-start bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                                        <div className="relative shrink-0">
                                            <Image width={72} height={72} src={img.preview} alt={`Preview ${index}`} className="h-16 w-16 rounded-lg border border-neutral-700 object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(index)}
                                                className="absolute -top-2 -left-2 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md cursor-pointer hover:bg-rose-400 transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <textarea
                                            value={img.caption}
                                            onChange={(e) => handleCaptionChange(index, e.target.value)}
                                            placeholder="เพิ่มคำอธิบายรูปภาพ..."
                                            rows={2}
                                            className="flex-1 bg-transparent text-white text-xs border-none outline-none resize-none placeholder:text-neutral-600 mt-1"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-3 flex items-center">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors bg-neutral-800 px-3 py-1.5 rounded-lg cursor-pointer"
                            >
                                📷 <span>แนบรูปภาพเพิ่ม</span>
                            </button>
                            {images.length > 0 && (
                                <span className="ml-3 text-xs text-neutral-500">{images.length} รูป</span>
                            )}
                        </div>

                        {noteError && (
                            <p className="text-rose-400 text-xs mt-2 font-medium">
                                ⚠️ กรุณากรอกข้อความหรือแนบรูปภาพก่อนกดบันทึก
                            </p>
                        )}

                        <div className="flex gap-2 mt-4">
                            <button
                                type="button"
                                onClick={resetNoteModal}
                                disabled={isUploading}
                                className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={async () => {
                                    if (!noteText.trim() && images.length === 0) {
                                        setNoteError(true);
                                        return;
                                    }

                                    setIsUploading(true);
                                    let uploadedImages: { url: string; caption: string }[] = [];

                                    if (images.length > 0) {
                                        const uploadPromises = images.map(async (img) => {
                                            const formData = new FormData();
                                            formData.append("file", img.file);
                                            const uploadRes = await uploadImageToDrive(formData);
                                            return uploadRes.success ? { url: uploadRes.url, caption: img.caption } : null;
                                        });

                                        const results = await Promise.all(uploadPromises);
                                        // กรองเอาเฉพาะที่อัปโหลดสำเร็จ
                                        uploadedImages = results.filter((res): res is { url: string; caption: string } => res !== null);
                                    }

                                    if (status === "IDLE" && currentSchedule?.id) {
                                        await createStudySession({ scheduleId: currentSchedule.id });
                                        setStatus("STUDYING"); 
                                    }

                                    // 🌟 ส่งข้อมูลพร้อม caption ไปบันทึก
                                    await addActionLogToDB("TAKE_NOTE", noteText, uploadedImages);

                                    setIsUploading(false);
                                    resetNoteModal();
                                }}
                                disabled={isUploading}
                                className="cursor-pointer flex-1 bg-blue-600 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:bg-blue-800"
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