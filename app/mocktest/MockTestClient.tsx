'use client'

import { useState, useEffect, useRef } from "react";

import dayjs from "dayjs";

import buddhistEra from "dayjs/plugin/buddhistEra";

import "dayjs/locale/th";

import {
    getActiveTestState,
    startMockTest,
    togglePauseResumeMockTest,
    enterScoringPhase,
    cancelMockTest,
    finishMockTest,
    ActiveTestState,
    addMockTestNote,
    backToRunning,
    deleteTestHistory,
} from "../actions/mocktest";

import { uploadImageToDrive } from "../actions/drive";

import Image from "next/image";



dayjs.extend(buddhistEra);

dayjs.locale("th");



/* ══════════════════════════════════════
   TYPES
══════════════════════════════════════ */
type Subject = { id: number; name: string; fullScore: number };
type ActionImage = { id: number; url: string; caption: string | null };
type ActionItem = {
    id: number;
    action: "START" | "PAUSE" | "RESUME" | "SCORING" | "NOTE" | "FINISH";
    note: string | null;
    time: Date;
    images: ActionImage[];
};
type TestHistory = {
    id: number;
    score: number;
    testDate: Date;
    notes: string | null;
    subject: Subject;
    actions: ActionItem[];
    timeLimitMinutes: number;
    timeSpentSeconds: number;
};
type TestStat = { subjectId: number; subjectName: string; fullScore: number; min: number; max: number; avg: number; count: number };
type TestPhase = "setup" | "running" | "paused" | "scoring";
type LocalImage = {
    id: string;
    file: File;
    preview: string;
    caption: string;
    status: "pending" | "uploading" | "done" | "error";
    driveUrl?: string;
};



interface Props {
    subjects: Subject[];
    history: TestHistory[];
    stats: TestStat[];
    initialActiveTest: ActiveTestState;
}



/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */

const pad = (n: number) => n.toString().padStart(2, "0");
function formatTime(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}
function formatMinutes(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}ชม. ${m}น.`;
    return `${m} น.`;
}
function pctColor(pct: number) {
    if (pct >= 80) return "text-emerald-400";
    if (pct >= 50) return "text-amber-400";
    return "text-red-400";
}
function pctBar(pct: number) {
    if (pct >= 80) return "bg-emerald-400";
    if (pct >= 50) return "bg-amber-400";
    return "bg-red-400";
}
function pctBorder(pct: number) {
    if (pct >= 80) return "border-emerald-500/30";
    if (pct >= 50) return "border-amber-500/30";
    return "border-red-500/30";
}



/* ══════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════ */
function TimerRing({ timeLeft, total, paused }: { timeLeft: number; total: number; paused: boolean }) {
    const r = 72, circ = 2 * Math.PI * r;
    const color = paused ? "#f59e0b" : timeLeft < 300 ? "#f87171" : "#34d399";
    return (
        <svg width="180" height="180" viewBox="0 0 180 180" className="absolute inset-0">
            <circle cx="90" cy="90" r={r} fill="none" stroke="#1a1a1a" strokeWidth="6" />
            <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - (total > 0 ? timeLeft / total : 1))}
                transform="rotate(-90 90 90)" style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.3s" }} />
        </svg>
    );
}
function ScoreBar({ score, fullScore }: { score: number; fullScore: number }) {
    const pct = (score / fullScore) * 100;
    return (
        <div className="h-1 bg-neutral-800 rounded-full overflow-hidden mt-2">
            <div className={`h-full rounded-full transition-all duration-500 ${pctBar(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
    );
}
function StatGrid({ min, avg, max, fullScore }: { min: number; avg: number; max: number; fullScore: number }) {
    return (
        <div className="grid grid-cols-3 gap-2 text-center mt-2.5">
            {[{ label: "MIN", value: min, color: "text-red-400" }, { label: "AVG", value: avg, color: pctColor((avg / fullScore) * 100) }, { label: "MAX", value: max, color: "text-emerald-400" }]
                .map(({ label, value, color }) => (
                    <div key={label} className="bg-neutral-900 rounded-xl py-2">
                        <p className={`text-[9px] font-bold tracking-widest opacity-50 ${color}`}>{label}</p>
                        <p className={`text-sm font-black mt-0.5 ${color}`}>{value.toFixed(1)}</p>
                    </div>
                ))}
        </div>
    );
}
function actionMeta(action: ActionItem["action"]) {
    switch (action) {
        case "START":   return { label: "เริ่มทำข้อสอบ",   icon: "▶",  colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
        case "PAUSE":   return { label: "พักการทำข้อสอบ",  icon: "⏸",  colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
        case "RESUME":  return { label: "กลับมาทำต่อ",     icon: "⏯",  colorClass: "text-sky-400 bg-sky-500/10 border-sky-500/20" };
        case "SCORING": return { label: "ส่งข้อสอบ",       icon: "✓",  colorClass: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
        case "NOTE":    return { label: "โน้ตระหว่างทำ",   icon: "✎",  colorClass: "text-violet-400 bg-violet-500/10 border-violet-500/20" };
        case "FINISH":  return { label: "บันทึกผลสอบ",     icon: "🏁", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
        default:        return { label: "กิจกรรม",          icon: "•",  colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20" };
    }
}

/* Time usage badge shown in history */
function TimeUsageBadge({ spent, limit }: { spent: number; limit: number }) {
    const limitSeconds = limit * 60;
    const usedPct = limitSeconds > 0 ? Math.min((spent / limitSeconds) * 100, 100) : 0;
    const spentFmt = formatMinutes(spent);
    const limitFmt = `${limit} น.`;

    let barColor = "bg-emerald-500/60";
    let textColor = "text-emerald-400";
    if (usedPct >= 95) { barColor = "bg-red-500/60"; textColor = "text-red-400"; }
    else if (usedPct >= 75) { barColor = "bg-amber-500/60"; textColor = "text-amber-400"; }

    return (
        <div className="flex items-center gap-2 mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-neutral-600 shrink-0">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${usedPct}%` }} />
                </div>
                <span className={`text-[10px] font-semibold tabular-nums shrink-0 ${textColor}`}>
                    {spentFmt}
                </span>
                <span className="text-[10px] text-neutral-700 shrink-0">/ {limitFmt}</span>
            </div>
        </div>
    );
}



/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function MockTestClient({ subjects, history, stats, initialActiveTest }: Props) {

    /* ── Phase & subject ── */
    const [phase, setPhase] = useState<TestPhase>(
        initialActiveTest ? (initialActiveTest.status.toLowerCase() as TestPhase) : "setup"
    );
    const [selectedSubject, setSelectedSubject] = useState<number | "">(initialActiveTest?.subjectId ?? "");

    /* ── Timer (local only) ── */
    const [inputHours, setInputHours] = useState(1);
    const [inputMinutes, setInputMinutes] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [timeSpent, setTimeSpent] = useState(0);

    /* ── Scoring / UI ── */
    const [score, setScore] = useState("");
    const [notes, setNotes] = useState("");
    const [forcedScoring, setForcedScoring] = useState(false);
    const [activeTab, setActiveTab] = useState<"history" | "stats">("history");
    const [showNotes, setShowNotes] = useState(false);
    const [quickNote, setQuickNote] = useState("");
    const [noteModalVisible, setNoteModalVisible] = useState(false);
    const [localImages, setLocalImages] = useState<LocalImage[]>([]);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    /* ── Derived ── */
    const subject = subjects.find(s => s.id === Number(selectedSubject));
    const timeLeft = Math.max(0, totalTime - timeSpent);
    const scorePct = subject && score ? (parseFloat(score) / subject.fullScore) * 100 : 0;
    const noteHasContent = quickNote.trim().length > 0 || localImages.length > 0;
    const pendingCount = localImages.filter(i => i.status === "pending").length;
    const uploadingCount = localImages.filter(i => i.status === "uploading").length;

    /* ── Refs ── */
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const phaseRef = useRef(phase);



    /* ══════════════════════════════════════
       EFFECTS
    ══════════════════════════════════════ */

    // Keep phaseRef in sync
    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // Cleanup object URLs on unmount
    useEffect(() => () => {
        localImages.forEach(img => URL.revokeObjectURL(img.preview));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Countdown — single interval, ref-guarded
    useEffect(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
        if (phase !== "running") return;

        countdownRef.current = setInterval(() => {
            setTimeSpent(prev => {
                const next = prev + 1;
                if (next >= totalTime && totalTime > 0) {
                    setForcedScoring(true);
                    setPhase("scoring");
                    enterScoringPhase();
                    if (countdownRef.current) {
                        clearInterval(countdownRef.current);
                        countdownRef.current = null;
                    }
                    return totalTime;
                }
                return next;
            });
        }, 1000);

        return () => {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
            }
        };
    }, [phase, totalTime]);

    // Sync phase with server every 3s — runs once, reads phase via ref
    useEffect(() => {
        const id = setInterval(async () => {
            const server = await getActiveTestState();
            if (!server) {
                if (phaseRef.current !== "setup") setPhase("setup");
                return;
            }
            const nextPhase = server.status.toLowerCase() as TestPhase;
            if (nextPhase !== phaseRef.current) setPhase(nextPhase);
            setSelectedSubject(server.subjectId);
        }, 3000);
        return () => clearInterval(id);
    }, []);



    /* ══════════════════════════════════════
       HANDLERS
    ══════════════════════════════════════ */

    const handleStart = async () => {
        const t = inputHours * 3600 + inputMinutes * 60;
        if (!selectedSubject || t <= 0) return;
        setTotalTime(t);
        setTimeSpent(0);
        setForcedScoring(false);
        setPhase("running");
        await startMockTest({ subjectId: Number(selectedSubject), timeLimitMinutes: inputHours * 60 + inputMinutes });
    };

    const handleTogglePause = async () => {
        const next = phase === "running" ? "paused" : "running";
        setPhase(next);
        await togglePauseResumeMockTest(next === "paused" ? "PAUSE" : "RESUME");
    };

    const handleForceScoring = async () => {
        setForcedScoring(false);
        setPhase("scoring");
        await enterScoringPhase();
    };

    const handleBackToRunning = async () => {
        setForcedScoring(false);
        setPhase("running");
        await backToRunning();
    };

    const handleCancel = async () => {
        setPhase("setup");
        setSelectedSubject("");
        setScore("");
        setNotes("");
        setTimeSpent(0);
        setTotalTime(0);
        setForcedScoring(false);
        await cancelMockTest();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("score", score);
            fd.append("notes", notes);
            const res = await finishMockTest(fd);
            if (res.success) {
                setPhase("setup");
                setSelectedSubject("");
                setScore("");
                setNotes("");
                setTimeSpent(0);
                setTotalTime(0);
                setForcedScoring(false);
            } else {
                alert((res as { success: false; message?: string }).message ?? "บันทึกไม่สำเร็จ");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newImages: LocalImage[] = Array.from(files).map(file => ({
            id: crypto.randomUUID(),
            file,
            preview: URL.createObjectURL(file),
            caption: "",
            status: "pending",
        }));
        setLocalImages(prev => [...prev, ...newImages]);
        e.target.value = "";
    };

    const handleCaptionChange = (id: string, caption: string) => {
        setLocalImages(prev => prev.map(i => i.id === id ? { ...i, caption } : i));
    };

    const handleRemoveImage = (id: string) => {
        setLocalImages(prev => {
            const img = prev.find(i => i.id === id);
            if (img) URL.revokeObjectURL(img.preview);
            return prev.filter(i => i.id !== id);
        });
    };

    const handleSaveNote = async () => {
        if (!noteHasContent) return;
        setIsSavingNote(true);
        try {
            const uploadedImages: { url: string; caption?: string }[] = [];

            for (const img of localImages.filter(i => i.status === "pending")) {
                setLocalImages(prev => prev.map(i => i.id === img.id ? { ...i, status: "uploading" } : i));
                try {
                    const fd = new FormData();
                    fd.append("file", img.file);
                    const res = await uploadImageToDrive(fd);
                    if (res.success && res.fileId) {
                        const driveUrl = `https://drive.google.com/thumbnail?id=${res.fileId}&sz=w1200`;
                        uploadedImages.push({ url: driveUrl, caption: img.caption || undefined });
                        setLocalImages(prev => prev.map(i => i.id === img.id ? { ...i, status: "done", driveUrl } : i));
                    } else {
                        setLocalImages(prev => prev.map(i => i.id === img.id ? { ...i, status: "error" } : i));
                    }
                } catch {
                    setLocalImages(prev => prev.map(i => i.id === img.id ? { ...i, status: "error" } : i));
                }
            }

            const alreadyDone = localImages
                .filter(i => i.status === "done" && i.driveUrl)
                .map(i => ({ url: i.driveUrl!, caption: i.caption || undefined }));
            const allImages = [...alreadyDone, ...uploadedImages];

            const noteRes = await addMockTestNote({
                note: quickNote.trim() || undefined,
                images: allImages.length > 0 ? allImages : undefined,
            });
            if (!noteRes.success) { alert("บันทึกโน้ตไม่สำเร็จ"); return; }

            localImages.forEach(img => URL.revokeObjectURL(img.preview));
            setQuickNote("");
            setLocalImages([]);
            setShowNotes(false);
        } finally {
            setIsSavingNote(false);
        }
    };

    const resetNoteModal = () => {
        setNoteModalVisible(false);
        setTimeout(() => {
            setShowNotes(false);
            setQuickNote("");
            localImages.forEach(img => URL.revokeObjectURL(img.preview));
            setLocalImages([]);
        }, 300);
    };

    const handleDeleteHistory = async (id: number) => {
        setDeletingId(id);
        try {
            const res = await deleteTestHistory(id);
            if (!res.success) alert("ลบไม่สำเร็จ");
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const openNoteModal = () => {
        setShowNotes(true);
        requestAnimationFrame(() => setNoteModalVisible(true));
    };



    /* ══════════════════════════════════════
       RENDER
    ══════════════════════════════════════ */
    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* ════ LEFT ════ */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">

                    {/* ── Setup ── */}
                    {phase === "setup" && (
                        <div className="p-6 space-y-4">
                            <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold">จำลองการสอบ</p>
                            <div className="space-y-1.5">
                                <label className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">วิชา</label>
                                <select
                                    value={selectedSubject}
                                    onChange={e => setSelectedSubject(parseInt(e.target.value))}
                                    className="w-full bg-neutral-950 text-white text-sm border border-neutral-800 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 outline-none appearance-none cursor-pointer transition-colors"
                                >
                                    <option value="" disabled>-- เลือกรายวิชา --</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name} · {s.fullScore} คะแนน</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">เวลา</label>
                                <div className="flex items-center gap-2">
                                    {([
                                        { value: inputHours, onChange: setInputHours, max: 10, label: "ชั่วโมง" },
                                        { value: inputMinutes, onChange: setInputMinutes, max: 59, label: "นาที" },
                                    ] as const).map(({ value, onChange, max, label }, i) => (
                                        <div key={label} className="flex items-center gap-2 flex-1">
                                            {i === 1 && <span className="text-neutral-600 font-bold pb-4">:</span>}
                                            <div className="relative flex-1">
                                                <input
                                                    type="number" min="0" max={max} value={value}
                                                    onChange={e => onChange(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-neutral-950 text-white text-center text-lg font-bold border border-neutral-800 focus:border-emerald-500/60 rounded-xl px-3 py-3 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none cursor-pointer"
                                                />
                                                <span className="absolute bottom-1.5 inset-x-0 text-center text-[10px] text-neutral-600 pointer-events-none">{label}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleStart}
                                disabled={!selectedSubject || (inputHours === 0 && inputMinutes === 0)}
                                className="w-full mt-1 py-3 rounded-xl text-sm font-bold transition-all bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-black cursor-pointer disabled:cursor-not-allowed"
                            >
                                เริ่มจับเวลา →
                            </button>
                        </div>
                    )}

                    {/* ── Running / Paused ── */}
                    {(phase === "running" || phase === "paused") && (
                        <div className="p-6 flex flex-col items-center">
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-6">
                                {subject?.name}
                            </span>
                            <div className="relative w-45 h-45 flex items-center justify-center mb-4">
                                <TimerRing timeLeft={timeLeft} total={totalTime} paused={phase === "paused"} />
                                <div className="relative z-10 text-center">
                                    <p className={`text-4xl font-black tabular-nums ${phase === "paused" ? "text-amber-400" : timeLeft < 300 ? "text-red-400" : "text-white"}`}>
                                        {formatTime(timeLeft)}
                                    </p>
                                    {phase === "paused" && <p className="text-[10px] text-amber-500/70 mt-1 font-semibold uppercase tracking-wider">หยุดชั่วคราว</p>}
                                    {phase === "running" && timeLeft < 300 && <p className="text-[10px] text-red-400/70 mt-1 font-semibold uppercase tracking-wider animate-pulse">ใกล้หมดเวลา</p>}
                                </div>
                            </div>
                            <p className="text-xs text-neutral-600 font-mono mb-5">ผ่านไป {formatTime(timeSpent)}</p>
                            <div className="flex gap-2 w-full">
                                <button onClick={handleTogglePause}
                                    className={`cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${phase === "running" ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"}`}>
                                    {phase === "running" ? "พัก" : "ทำต่อ"}
                                </button>
                                <button
                                    onClick={openNoteModal}
                                    className="cursor-pointer relative w-11 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                    </svg>
                                    {localImages.length > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-black text-[10px] font-black flex items-center justify-center">
                                            {localImages.length}
                                        </span>
                                    )}
                                </button>
                                <button onClick={handleForceScoring}
                                    className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/20 transition-colors">
                                    ส่งข้อสอบ
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Scoring ── */}
                    {phase === "scoring" && (
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    {forcedScoring ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
                                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white">
                                        {forcedScoring ? "หมดเวลาสอบ" : "ส่งข้อสอบแล้ว"}
                                    </p>
                                    <p className="text-xs text-neutral-500 font-mono">{subject?.name}</p>
                                </div>
                                {/* Note button in scoring phase */}
                                <button
                                    onClick={openNoteModal}
                                    className="cursor-pointer relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors text-xs font-semibold shrink-0"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                    </svg>
                                    บันทึกโน้ต
                                    {localImages.length > 0 && (
                                        <span className="w-4 h-4 rounded-full bg-violet-500 text-white text-[9px] font-black flex items-center justify-center">
                                            {localImages.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {!forcedScoring && (
                                <button
                                    onClick={handleBackToRunning}
                                    className="cursor-pointer w-full mb-4 py-2 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
                                    </svg>
                                    กลับไปทำต่อ
                                </button>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block mb-1.5">คะแนนที่ได้</label>
                                    <div className="relative">
                                        <input
                                            type="number" step="0.01" max={subject?.fullScore ?? 999}
                                            required autoFocus value={score} onChange={e => setScore(e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-neutral-950 text-white text-2xl font-black border border-neutral-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 pr-20 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        {subject && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">/ {subject.fullScore}</span>}
                                    </div>
                                    {score && subject && (
                                        <>
                                            <p className={`text-[11px] font-bold mt-1.5 ${pctColor(scorePct)}`}>{scorePct.toFixed(1)}%</p>
                                            <ScoreBar score={parseFloat(score)} fullScore={subject.fullScore} />
                                        </>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block mb-1.5">บันทึก</label>
                                    <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                                        placeholder="ข้อผิดพลาด สิ่งที่ต้องทบทวน..."
                                        className="w-full bg-neutral-950 text-white text-sm border border-neutral-800 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 outline-none resize-none placeholder:text-neutral-700"
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={handleCancel}
                                        className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm text-neutral-500 border border-neutral-800 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors">
                                        ยกเลิก
                                    </button>
                                    <button type="submit" disabled={isSubmitting}
                                        className="cursor-pointer flex-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors">
                                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกผล"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                </div>

                {/* Stats sidebar */}
                <div className="hidden lg:block bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                    <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-4">สถิติรายวิชา</p>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {stats.length > 0 ? stats.map(stat => (
                            <div key={stat.subjectId} className="bg-neutral-950/60 border border-neutral-800/60 rounded-xl p-3.5">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-semibold text-neutral-200">{stat.subjectName}</p>
                                    <span className="text-[10px] text-neutral-600">{stat.count} ครั้ง</span>
                                </div>
                                <StatGrid min={stat.min} avg={stat.avg} max={stat.max} fullScore={stat.fullScore} />
                                <ScoreBar score={stat.avg} fullScore={stat.fullScore} />
                            </div>
                        )) : <p className="text-xs text-neutral-700 text-center py-6">ยังไม่มีสถิติ</p>}
                    </div>
                </div>
            </div>

            {/* ════ RIGHT ════ */}
            <div className="lg:col-span-3 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="flex border-b border-neutral-800">
                    {(["history", "stats"] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`cursor-pointer flex-1 py-3.5 text-sm font-semibold transition-colors ${activeTab === tab ? "text-white border-b-2 border-emerald-500 -mb-px bg-neutral-800/30" : "text-neutral-500 hover:text-neutral-300"}`}>
                            {tab === "history" ? `ประวัติ (${history.length})` : "สถิติ"}
                        </button>
                    ))}
                </div>
                <div className="p-5">
                    {activeTab === "history" && (
                        <div className="space-y-3 max-h-150 overflow-y-auto pr-1">
                            {history.length > 0 ? history.map(item => {
                                const p = (item.score / item.subject.fullScore) * 100;
                                const expanded = expandedHistory === item.id;
                                const isDeleting = deletingId === item.id;
                                const isConfirming = confirmDeleteId === item.id;

                                return (
                                    <div key={item.id} className={`border rounded-xl p-4 hover:border-neutral-700 transition-colors ${pctBorder(p)}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-neutral-200">{item.subject.name}</p>
                                                <p className="text-[11px] text-neutral-600 font-mono mt-0.5">
                                                    {dayjs(item.testDate).format("D MMM BBBB · h:mm A")}
                                                </p>
                                                {/* ── Time usage badge ── */}
                                                {item.timeLimitMinutes > 0 && (
                                                    <TimeUsageBadge
                                                        spent={item.timeSpentSeconds}
                                                        limit={item.timeLimitMinutes}
                                                    />
                                                )}
                                                {item.notes && (
                                                    <p className="text-xs text-neutral-500 mt-2 border-l-2 border-neutral-700 pl-2 italic line-clamp-2">
                                                        {item.notes}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <div className="text-right">
                                                    <span className={`text-2xl font-black tabular-nums ${pctColor(p)}`}>{item.score}</span>
                                                    <p className="text-[10px] text-neutral-600 mt-0.5">/ {item.subject.fullScore}</p>
                                                    <p className={`text-[10px] font-bold mt-0.5 ${pctColor(p)}`}>{p.toFixed(0)}%</p>
                                                </div>
                                                {/* Delete button */}
                                                {isConfirming ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleDeleteHistory(item.id)}
                                                            disabled={isDeleting}
                                                            className="cursor-pointer px-2 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                                        >
                                                            {isDeleting ? "..." : "ลบ"}
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="cursor-pointer px-2 py-1 rounded-lg bg-neutral-800 text-neutral-400 text-[10px] font-bold hover:bg-neutral-700 transition-colors"
                                                        >
                                                            ยกเลิก
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDeleteId(item.id)}
                                                        className="cursor-pointer w-7 h-7 rounded-lg bg-neutral-800/80 border border-neutral-700/50 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors flex items-center justify-center"
                                                        title="ลบประวัตินี้"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <ScoreBar score={item.score} fullScore={item.subject.fullScore} />
                                        {item.actions.length > 0 && (
                                            <button onClick={() => setExpandedHistory(expanded ? null : item.id)}
                                                className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer">
                                                {expanded ? "ซ่อนกิจกรรม ▲" : `ดูกิจกรรม (${item.actions.length}) ▼`}
                                            </button>
                                        )}
                                        {expanded && (
                                            <div className="mt-4 space-y-2.5 border-t border-neutral-800 pt-4">
                                                {item.actions.map(act => {
                                                    const meta = actionMeta(act.action);
                                                    return (
                                                        <div key={act.id} className="flex gap-3">
                                                            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 text-xs ${meta.colorClass}`}>
                                                                {meta.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0 pt-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-semibold text-neutral-300">{meta.label}</span>
                                                                    <span className="text-[10px] text-neutral-600 font-mono">{dayjs(act.time).format("h:mm A")}</span>
                                                                </div>
                                                                {act.note && <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{act.note}</p>}
                                                                {act.images.length > 0 && (
                                                                    <div className="flex gap-2 mt-2 flex-wrap">
                                                                        {act.images.map(img => (
                                                                            <div key={img.id} className="flex flex-col gap-1">
                                                                                <a href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                                                                                    <Image
                                                                                        width={128} height={128} quality={100} src={img.url}
                                                                                        alt={img.caption ?? ""}
                                                                                        className="w-16 h-16 object-cover rounded-lg border border-neutral-700 hover:opacity-80 transition-opacity"
                                                                                    />
                                                                                </a>
                                                                                {img.caption && (
                                                                                    <p className="text-[10px] text-neutral-500 w-16 leading-tight text-center line-clamp-2">
                                                                                        {img.caption}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-16">
                                    <p className="text-sm text-neutral-600">ยังไม่มีประวัติ</p>
                                    <p className="text-xs text-neutral-700 mt-1">เริ่มจำลองสอบครั้งแรกได้เลย</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "stats" && (
                        <div className="space-y-3">
                            {stats.length > 0 ? stats.map(stat => {
                                const avgPct = (stat.avg / stat.fullScore) * 100;
                                return (
                                    <div key={stat.subjectId} className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <p className="text-sm font-bold text-neutral-200">{stat.subjectName}</p>
                                                <p className="text-[11px] text-neutral-600 mt-0.5">เต็ม {stat.fullScore} · {stat.count} ครั้ง</p>
                                            </div>
                                            <span className={`text-lg font-black ${pctColor(avgPct)}`}>{avgPct.toFixed(0)}%</span>
                                        </div>
                                        <StatGrid min={stat.min} avg={stat.avg} max={stat.max} fullScore={stat.fullScore} />
                                        <ScoreBar score={stat.avg} fullScore={stat.fullScore} />
                                    </div>
                                );
                            }) : <div className="text-center py-16"><p className="text-sm text-neutral-600">ยังไม่มีสถิติ</p></div>}
                        </div>
                    )}
                </div>
            </div>

            {/* ════ NOTE MODAL ════ */}
            {showNotes && (
                <div onClick={resetNoteModal}
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-md ${noteModalVisible ? "bg-black/60 opacity-100" : "bg-black/0 opacity-0"}`}>
                    <div onClick={e => e.stopPropagation()}
                        className={`relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-[28px] border border-white/10 bg-[#121212]/95 shadow-2xl overflow-hidden transition-all duration-300 ${noteModalVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-95 opacity-0"}`}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Quick Notes</h2>
                                    <p className="text-[11px] text-neutral-500">
                                        {phase === "scoring" ? "บันทึกระหว่างตรวจ" : "จดระหว่างทำข้อสอบ"}
                                    </p>
                                </div>
                            </div>
                            <button onClick={resetNoteModal}
                                className="cursor-pointer w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center text-sm">
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            <textarea value={quickNote} onChange={e => setQuickNote(e.target.value)}
                                placeholder="เช่น สูตรที่ลืม จุดที่ต้องกลับมาทวน..."
                                className="w-full min-h-35 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 text-sm text-white leading-relaxed outline-none resize-none placeholder:text-neutral-700 focus:border-emerald-500/50 transition-colors"
                            />
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold">รูปภาพ</p>
                                    {localImages.length > 0 && <span className="text-[11px] text-neutral-600">{localImages.length} รูป</span>}
                                </div>
                                {localImages.length > 0 ? (
                                    <div className="space-y-2">
                                        {localImages.map(img => (
                                            <div key={img.id} className="flex gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-2.5">
                                                {/* Thumbnail */}
                                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-800 bg-black shrink-0">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={img.preview} alt="" className="w-full h-full object-cover" />

                                                    {/* Status overlay */}
                                                    {img.status === "uploading" && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                            <svg className="animate-spin w-5 h-5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                            </svg>
                                                        </div>
                                                    )}

                                                    {/* Status badge */}
                                                    {img.status === "done" && (
                                                        <div className="absolute bottom-1 left-1 bg-emerald-500 rounded-md px-1 py-0.5 flex items-center gap-0.5">
                                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                        </div>
                                                    )}
                                                    {img.status === "error" && (
                                                        <div className="absolute bottom-1 left-1 bg-red-500 rounded-md px-1 py-0.5">
                                                            <span className="text-[8px] font-bold text-white">!</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: filename + caption input + remove */}
                                                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-[11px] text-neutral-500 truncate leading-tight pt-0.5">
                                                            {img.file.name}
                                                        </p>
                                                        {(img.status === "pending" || img.status === "error") && (
                                                            <button
                                                                onClick={() => handleRemoveImage(img.id)}
                                                                className="cursor-pointer shrink-0 w-6 h-6 rounded-lg bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 text-neutral-500 transition-colors flex items-center justify-center text-xs"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>

                                                    <input
                                                        type="text"
                                                        value={img.caption}
                                                        onChange={e => handleCaptionChange(img.id, e.target.value)}
                                                        placeholder="คำอธิบายรูป (ถ้ามี)"
                                                        disabled={img.status === "uploading" || img.status === "done"}
                                                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-neutral-700 outline-none transition-colors"
                                                    />

                                                    <p className="text-[10px] text-neutral-700">
                                                        {img.status === "pending" && "รอบันทึก"}
                                                        {img.status === "uploading" && <span className="text-amber-400">กำลังอัพโหลด…</span>}
                                                        {img.status === "done" && <span className="text-emerald-400">อัพโหลดแล้ว ✓</span>}
                                                        {img.status === "error" && <span className="text-red-400">อัพโหลดไม่สำเร็จ</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add more */}
                                        <label className="cursor-pointer flex items-center gap-2.5 rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/50 px-4 py-3 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors">
                                            <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                                </svg>
                                            </div>
                                            <span className="text-sm text-neutral-400">เพิ่มรูปภาพ</span>
                                            <input type="file" multiple accept="image/*" onChange={handlePickImages} className="hidden" />
                                        </label>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/50 px-6 py-8 cursor-pointer hover:border-emerald-500/40 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" x2="12" y1="3" y2="15" />
                                        </svg>
                                        <p className="text-sm font-semibold text-neutral-300">เลือกรูปภาพ</p>
                                        <p className="text-[11px] text-neutral-600">PNG · JPG · JPEG</p>
                                        <input type="file" multiple accept="image/*" onChange={handlePickImages} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-neutral-800 px-6 py-4 flex items-center justify-between">
                            <p className="text-[11px]">
                                {uploadingCount > 0
                                    ? <span className="text-amber-400 font-medium">กำลังอัพโหลด {uploadingCount} รูป…</span>
                                    : pendingCount > 0
                                        ? <span className="text-neutral-500">{pendingCount} รูปรอบันทึก</span>
                                        : localImages.length > 0
                                            ? <span className="text-emerald-400">อัพโหลดครบแล้ว ✓</span>
                                            : <span className="text-neutral-700">ยังไม่มีรูป</span>
                                }
                            </p>
                            <button onClick={handleSaveNote}
                                disabled={isSavingNote || !noteHasContent}
                                className="cursor-pointer px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-bold transition-colors active:scale-95">
                                {isSavingNote ? "กำลังบันทึก…" : "บันทึก"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}