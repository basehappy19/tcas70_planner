'use client'

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import buddhistEra from "dayjs/plugin/buddhistEra";
import "dayjs/locale/th";
import { updateSchedule, getScheduleHistory } from "@/features/schedules/services/schedule";
import Image from "next/image";

dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.extend(buddhistEra);
dayjs.locale("th");

// ─── Types ────────────────────────────────────────────────────────────────────

type ScheduleItem = {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    type?: string;
    dayOfWeek: number;
};

type StudyLogWithActions = {
    id: number;
    date: Date;
    actualStartAt: Date | null;
    delayMinutes: number;
    status: string;
    actionLogs: {
        id: number;
        time: Date;
        action: string;
        note: string | null;
        images?: { id: number; url: string; caption?: string | null }[];
    }[];
};

type FreeStudyLogEntry = {
    id: number;
    title: string;
    startedAt: Date;
    endedAt: Date | null;
    status: string;
    actionLogs: {
        id: number;
        time: Date;
        action: string;
        note: string | null;
        images?: { id: number; url: string; caption?: string | null }[];
    }[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
    CONTENT:   { dot: "bg-blue-400",    bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200" },
    FREE_TIME: { dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
    MOCK_TEST: { dot: "bg-violet-400",  bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-200" },
};

const ACTION_LABELS: Record<string, string> = {
    START_ON_TIME: "เริ่มตรงเวลา",
    START_LATE:    "เริ่มช้า",
    PAUSE:         "พักเบรก",
    RESUME:        "เรียนต่อ",
    TAKE_NOTE:     "จดโน้ต",
    END_SESSION:   "จบการเรียน",
    START:         "เริ่มเรียน",
};

const ACTION_COLORS: Record<string, string> = {
    START_ON_TIME: "text-emerald-600 bg-emerald-50 border-emerald-200",
    START_LATE:    "text-amber-600 bg-amber-50 border-amber-200",
    PAUSE:         "text-amber-600 bg-amber-50 border-amber-200",
    RESUME:        "text-blue-600 bg-blue-50 border-blue-200",
    TAKE_NOTE:     "text-violet-600 bg-violet-50 border-violet-200",
    END_SESSION:   "text-rose-600 bg-rose-50 border-rose-200",
    START:         "text-emerald-600 bg-emerald-50 border-emerald-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(startedAt: Date, endedAt: Date | null) {
    if (!endedAt) return null;
    const diffSec = dayjs(endedAt).diff(dayjs(startedAt), "second");
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    if (h > 0) return `${h} ชม. ${m} น.`;
    return `${m} น.`;
}

function getGoogleDriveImageUrl(url: string) {
    const match = url.match(/\/d\/(.*?)\//);
    if (!match) return url;
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionLogList({
    actionLogs,
    onImageClick,
}: {
    actionLogs: StudyLogWithActions["actionLogs"] | FreeStudyLogEntry["actionLogs"];
    onImageClick: (url: string, caption?: string | null) => void;
}) {
    if (actionLogs.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-stone-200 py-8 text-center">
                <p className="text-sm text-stone-400 italic">ไม่มีบันทึกกิจกรรม</p>
            </div>
        );
    }
    return (
        <ul className="space-y-4">
            {actionLogs.map(al => (
                <li key={al.id} className="flex gap-4">
                    <div className="w-14 shrink-0">
                        <span className="text-[11px] font-mono text-stone-400">
                            {dayjs(al.time).format("h:mm A")}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg border ${ACTION_COLORS[al.action] ?? "text-stone-600 bg-stone-50 border-stone-200"}`}>
                            {ACTION_LABELS[al.action] ?? al.action}
                        </div>
                        {al.note && (
                            <div className="mt-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
                                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap wrap-break-word">
                                    {al.note}
                                </p>
                            </div>
                        )}
                        {al.images && al.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {al.images.map(img => {
                                    const imageUrl = getGoogleDriveImageUrl(img.url);
                                    return (
                                        <button
                                            key={img.id}
                                            onClick={() => onImageClick(imageUrl, img.caption)}
                                            className="cursor-pointer group relative block w-20 h-20 rounded-xl overflow-hidden border border-stone-200 hover:border-stone-300 transition-all"
                                        >
                                            <Image
                                                width={80} height={80}
                                                src={imageUrl}
                                                alt={img.caption || "Note image"}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            {img.caption && (
                                                <div className="absolute bottom-0 inset-x-0 bg-black/50 backdrop-blur-sm text-[10px] text-white px-2 py-1 truncate">
                                                    {img.caption}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScheduleGrid({ item, isToday }: { item: ScheduleItem; isToday?: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editVisible, setEditVisible] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{ url: string; caption?: string | null } | null>(null);
    const [imageVisible, setImageVisible] = useState(false);
    const [isCurrentTimeSlot, setIsCurrentTimeSlot] = useState(false);
    const [historyData, setHistoryData] = useState<StudyLogWithActions[]>([]);
    const [freeStudyByDate, setFreeStudyByDate] = useState<Record<string, FreeStudyLogEntry[]>>({});
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [formData, setFormData] = useState({ title: item.title, startTime: item.startTime, endTime: item.endTime });
    const [errors, setErrors] = useState({ title: false, startTime: false, endTime: false });

    const fmt = (t: string) => t ? dayjs(t, "HH:mm").format("h:mm A") : "";
    const validateForm = () => {
        const newErrors = { title: !formData.title.trim(), startTime: !formData.startTime, endTime: !formData.endTime };
        setErrors(newErrors);
        return !Object.values(newErrors).some(Boolean);
    };
    const isFormValid = formData.title.trim() && formData.startTime && formData.endTime;

    useEffect(() => {
        if (!isToday) return;
        const check = () => {
            const now = dayjs();
            const s = dayjs(item.startTime, "HH:mm");
            const e = dayjs(item.endTime, "HH:mm");
            setIsCurrentTimeSlot(
                now.isAfter(now.hour(s.hour()).minute(s.minute()).second(0)) &&
                now.isBefore(now.hour(e.hour()).minute(e.minute()).second(0))
            );
        };
        check();
        const id = setInterval(check, 30000);
        return () => clearInterval(id);
    }, [isToday, item.startTime, item.endTime]);

    const handleUpdate = async () => {
        if (!validateForm()) return;
        const res = await updateSchedule(item.id, formData);
        if (res.success) { setErrors({ title: false, startTime: false, endTime: false }); closeEditModal(); }
        else alert(res.message);
    };

    const openEditModal = () => { setIsEditing(true); requestAnimationFrame(() => setEditVisible(true)); };
    const closeEditModal = () => { setEditVisible(false); setTimeout(() => setIsEditing(false), 250); };

    const openHistoryModal = async () => {
        setShowHistory(true);
        requestAnimationFrame(() => setHistoryVisible(true));
        setLoadingHistory(true);

        // ดึงทั้ง scheduled history และ free study ของวันที่มี session
        const res = await getScheduleHistory(item.id);
        if (res.success && res.data) {
            setHistoryData(res.data.scheduledLogs ?? res.data);

            // group free study logs by date string (YYYY-MM-DD)
            const freeMap: Record<string, FreeStudyLogEntry[]> = {};
            for (const fl of (res.data.freeStudyLogs ?? [])) {
                const dateKey = dayjs(fl.startedAt).format("YYYY-MM-DD");
                if (!freeMap[dateKey]) freeMap[dateKey] = [];
                freeMap[dateKey].push(fl);
            }
            setFreeStudyByDate(freeMap);
        }
        setLoadingHistory(false);
    };
    const closeHistoryModal = () => { setHistoryVisible(false); setTimeout(() => setShowHistory(false), 250); };

    const openImageModal = (url: string, caption?: string | null) => {
        setSelectedImage({ url, caption });
        requestAnimationFrame(() => setImageVisible(true));
    };
    const closeImageModal = () => { setImageVisible(false); setTimeout(() => setSelectedImage(null), 250); };

    const typeColor = TYPE_COLORS[item.type?.toUpperCase() ?? ""] ?? {
        dot: "bg-stone-400", bg: "bg-stone-50", text: "text-stone-500", border: "border-stone-200"
    };

    const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const scheduleInfo = `วัน${DAY_NAMES[item.dayOfWeek]} • ${fmt(item.startTime)} - ${fmt(item.endTime)}`;

    return (
        <>
            {/* ── Schedule Card ── */}
            <div className={`relative rounded-2xl p-3 border transition-all duration-200 ${
                isCurrentTimeSlot
                    ? "bg-emerald-50 border-emerald-200 shadow-[0_2px_16px_rgba(5,150,105,0.1)]"
                    : isToday
                        ? "bg-white border-stone-200 hover:border-stone-300 shadow-[0_1px_8px_rgba(0,0,0,0.05)]"
                        : "bg-white border-stone-100 hover:border-stone-200"
            }`}>
                {isCurrentTimeSlot && (
                    <span className="absolute -top-2.5 right-3 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider">
                        ตอนนี้
                    </span>
                )}
                <p className="text-[10px] text-stone-400 font-mono mb-1.5 tabular-nums">
                    {fmt(item.startTime)} – {fmt(item.endTime)}
                </p>
                <div className="flex items-start gap-1.5 mb-3">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${typeColor.dot}`} />
                    <p className="text-sm font-bold text-stone-700 leading-snug line-clamp-2">{item.title}</p>
                </div>
                <div className="flex gap-1.5">
                    <button
                        onClick={openHistoryModal}
                        className="cursor-pointer flex-1 text-[11px] font-semibold text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 py-1.5 rounded-xl transition-colors"
                    >
                        ประวัติ
                    </button>
                    <button
                        onClick={openEditModal}
                        className="cursor-pointer px-2.5 text-[11px] text-stone-400 hover:text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 py-1.5 rounded-xl transition-colors"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── History Modal ── */}
            {showHistory && (
                <div
                    onClick={closeHistoryModal}
                    className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 ${
                        historyVisible ? "bg-black/20 opacity-100" : "bg-black/0 opacity-0"
                    }`}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className={`bg-white border border-stone-200 w-full max-w-2xl rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.15)] flex flex-col max-h-[88vh] overflow-hidden transition-all duration-300 ${
                            historyVisible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-6 opacity-0"
                        }`}
                    >
                        <div className="h-1.5 w-full bg-linear-to-r from-emerald-400 to-teal-300 shrink-0" />

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-stone-100 shrink-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-base">📚</div>
                                        <h2 className="text-lg font-black text-stone-800">ประวัติการเรียน</h2>
                                    </div>
                                    <p className="text-sm text-stone-700 font-semibold line-clamp-1">{item.title}</p>
                                    <p className="text-xs text-stone-400 mt-0.5">{scheduleInfo}</p>
                                </div>
                                <button
                                    onClick={closeHistoryModal}
                                    className="cursor-pointer shrink-0 w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center text-sm font-bold"
                                >✕</button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-emerald-500 animate-spin" />
                                </div>
                            ) : historyData.length === 0 && Object.keys(freeStudyByDate).length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="text-4xl mb-4">📚</div>
                                    <p className="text-base font-bold text-stone-400">ยังไม่มีประวัติ</p>
                                    <p className="text-sm text-stone-300 mt-2">เริ่มเรียนแล้วประวัติจะปรากฏที่นี่</p>
                                </div>
                            ) : historyData.map(log => {
                                const dateKey = dayjs(log.date).format("YYYY-MM-DD");
                                const freeLogs = freeStudyByDate[dateKey] ?? [];
                                return (
                                    <div key={log.id} className="rounded-2xl border border-stone-100 bg-stone-50/60 overflow-hidden">
                                        {/* Date header */}
                                        <div className="px-5 py-4 border-b border-stone-100 bg-white">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-stone-800">
                                                        {dayjs(log.date).format("D MMMM BBBB")}
                                                    </p>
                                                    <p className="text-[11px] text-stone-400 mt-1 font-mono">
                                                        เริ่ม {log.actualStartAt ? dayjs(log.actualStartAt).format("h:mm A") : "—"}
                                                        {log.delayMinutes > 0 && (
                                                            <span className="text-rose-500 ml-2 font-semibold">+{log.delayMinutes} นาที</span>
                                                        )}
                                                    </p>
                                                </div>
                                                {freeLogs.length > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-200 shrink-0">
                                                        +{freeLogs.length} นอกตาราง
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Scheduled session logs */}
                                        <div className="p-5">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">
                                                📅 เรียนในตาราง
                                            </p>
                                            <ActionLogList
                                                actionLogs={log.actionLogs}
                                                onImageClick={openImageModal}
                                            />
                                        </div>

                                        {/* Free study sessions on the same day */}
                                        {freeLogs.length > 0 && (
                                            <div className="px-5 pb-5 space-y-4">
                                                <div className="h-px bg-stone-100" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-violet-500">
                                                    🟣 เรียนนอกตาราง
                                                </p>
                                                {freeLogs.map(fl => {
                                                    const duration = formatDuration(fl.startedAt, fl.endedAt);
                                                    return (
                                                        <div key={fl.id} className="rounded-2xl border border-violet-100 bg-violet-50/40 overflow-hidden">
                                                            {/* Free session header */}
                                                            <div className="px-4 py-3 border-b border-violet-100 bg-white/70">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-stone-800">{fl.title}</p>
                                                                        <p className="text-[11px] font-mono text-stone-400 mt-0.5">
                                                                            {dayjs(fl.startedAt).format("h:mm A")}
                                                                            {fl.endedAt && ` – ${dayjs(fl.endedAt).format("h:mm A")}`}
                                                                        </p>
                                                                    </div>
                                                                    {duration && (
                                                                        <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                                                                            ⏱ {duration}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* Free session action logs */}
                                                            <div className="p-4">
                                                                <ActionLogList
                                                                    actionLogs={fl.actionLogs}
                                                                    onImageClick={openImageModal}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-stone-100 px-5 py-4 shrink-0">
                            <button
                                onClick={closeHistoryModal}
                                className="cursor-pointer w-full rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 py-3 text-sm font-bold text-stone-500 hover:text-stone-700 transition-all"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ── */}
            {isEditing && (
                <div
                    onClick={closeEditModal}
                    className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 ${
                        editVisible ? "bg-black/20 opacity-100" : "bg-black/0 opacity-0"
                    }`}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className={`bg-white border border-stone-200 w-full max-w-lg rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 ${
                            editVisible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-6 opacity-0"
                        }`}
                    >
                        <div className="h-1.5 w-full bg-linear-to-r from-stone-300 to-stone-200" />
                        <div className="px-6 py-5 border-b border-stone-100">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </div>
                                        <h2 className="text-lg font-black text-stone-800">แก้ไขคาบเรียน</h2>
                                    </div>
                                    <p className="text-xs text-stone-400 mt-2 ml-10.5">{scheduleInfo}</p>
                                </div>
                                <button
                                    onClick={closeEditModal}
                                    className="cursor-pointer shrink-0 w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center text-sm font-bold"
                                >✕</button>
                            </div>
                        </div>
                        <div className="px-6 py-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1.5">ชื่อวิชา</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => { setFormData({ ...formData, title: e.target.value }); if (e.target.value.trim()) setErrors({ ...errors, title: false }); }}
                                    className={`w-full bg-stone-50 text-stone-800 text-sm border rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-stone-300 ${errors.title ? "border-rose-300 bg-rose-50/50 focus:border-rose-400" : "border-stone-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"}`}
                                />
                                {errors.title && <p className="text-rose-500 text-xs mt-1.5 font-medium">กรุณากรอกชื่อวิชา</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "เริ่ม", key: "startTime", error: errors.startTime, errMsg: "กรุณาเลือกเวลาเริ่ม" },
                                    { label: "จบ",    key: "endTime",   error: errors.endTime,   errMsg: "กรุณาเลือกเวลาจบ" },
                                ].map(({ label, key, error, errMsg }) => (
                                    <div key={key}>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1.5">{label}</label>
                                        <input
                                            type="time"
                                            value={formData[key as keyof typeof formData]}
                                            onChange={e => { setFormData({ ...formData, [key]: e.target.value }); if (e.target.value) setErrors({ ...errors, [key]: false }); }}
                                            className={`cursor-pointer w-full bg-stone-50 text-stone-800 text-sm border rounded-2xl px-4 py-3 outline-none transition-all ${error ? "border-rose-300 bg-rose-50/50" : "border-stone-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"}`}
                                        />
                                        {error && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errMsg}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border-t border-stone-100 px-6 py-5 grid grid-cols-2 gap-3">
                            <button onClick={closeEditModal} className="cursor-pointer py-3 rounded-2xl text-sm font-bold text-stone-500 border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-all">
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={!isFormValid}
                                className={`py-3 rounded-2xl text-sm font-black transition-all ${isFormValid ? "cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_4px_16px_rgba(5,150,105,0.25)]" : "cursor-not-allowed bg-stone-100 text-stone-300"}`}
                            >
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Image Lightbox ── */}
            {selectedImage && (
                <div
                    onClick={closeImageModal}
                    className={`fixed inset-0 z-60 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 ${
                        imageVisible ? "bg-black/30 opacity-100" : "bg-black/0 opacity-0"
                    }`}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className={`relative w-full max-w-5xl flex flex-col items-center transition-all duration-300 ${
                            imageVisible ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
                        }`}
                    >
                        <button
                            onClick={closeImageModal}
                            className="cursor-pointer absolute -top-12 right-0 w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center font-bold"
                        >✕</button>
                        <div className="relative w-full flex justify-center">
                            <Image
                                src={selectedImage.url}
                                alt={selectedImage.caption || "Preview image"}
                                width={1400} height={1400}
                                className="max-h-[72vh] w-auto max-w-full object-contain rounded-2xl border border-white/20 shadow-2xl"
                            />
                        </div>
                        <div className="w-full max-w-3xl mt-4 bg-white/90 backdrop-blur-md border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between shadow-lg">
                            <p className="text-sm text-stone-700 wrap-break-word leading-relaxed flex-1 min-w-0">
                                {selectedImage.caption || "ไม่มีคำอธิบาย"}
                            </p>
                            <a
                                href={selectedImage.url}
                                download target="_blank" rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-[0_4px_12px_rgba(5,150,105,0.3)]"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <path d="M7 10l5 5 5-5" /><path d="M12 15V3" />
                                </svg>
                                ดาวน์โหลดรูป
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}