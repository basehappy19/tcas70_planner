'use client'
import { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import buddhistEra from 'dayjs/plugin/buddhistEra';
import 'dayjs/locale/th';
import Image from "next/image";
import {
    startFreeStudySession,
    getFreeStudyState,
    pauseFreeStudy,
    resumeFreeStudy,
    addFreeStudyNote,
    endFreeStudy,
} from "@/app/actions/freeStudy";
import { uploadImageToDrive } from "@/app/actions/drive";

dayjs.extend(buddhistEra);
dayjs.locale('th');

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionState = {
    id: number;
    title: string;
    status: "IN_PROGRESS" | "PAUSED" | "COMPLETED";
    startedAt: string;
} | null;

type Props = {
    initialSession: SessionState;
};

type NoteImageData = {
    file: File;
    preview: string;
    caption: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_FULL_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

const SUBJECT_PRESETS = [
    { label: "TGAT1", emoji: "💂" },
    { label: "TGAT2", emoji: "📦" },
    { label: "TGAT3", emoji: "🛺" },
    { label: "TPAT3", emoji: "⚙️" },
];

function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatElapsedReadable(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h} ชม. ${m} น. ${s} วิ`;
    if (m > 0) return `${m} น. ${s} วิ`;
    return `${s} วิ`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FreeStudySection({ initialSession }: Props) {
    // ── Clock ──
    const [currentTime, setCurrentTime] = useState(dayjs().format("h:mm:ss A"));
    const [nowDow, setNowDow] = useState(dayjs().day());

    // ── Session ──
    const [session, setSession] = useState<SessionState>(initialSession);
    const [status, setStatus] = useState<"IDLE" | "IN_PROGRESS" | "PAUSED">(
        initialSession
            ? initialSession.status === "IN_PROGRESS" ? "IN_PROGRESS" : "PAUSED"
            : "IDLE"
    );

    // ── Timer ──
    const [elapsedSeconds, setElapsedSeconds] = useState(() => {
        if (!initialSession) return 0;
        return dayjs().diff(dayjs(initialSession.startedAt), "second");
    });
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Start form ──
    const [titleInput, setTitleInput] = useState("");
    const [titleError, setTitleError] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    // ── Note modal ──
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteModalVisible, setNoteModalVisible] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [noteError, setNoteError] = useState(false);
    const [images, setImages] = useState<NoteImageData[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── End confirm ──
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [isEnding, setIsEnding] = useState(false);

    // ── Sync server state every 5s ──
    useEffect(() => {
        const interval = setInterval(async () => {
            const s = await getFreeStudyState();
            if (!s && status !== "IDLE") {
                setStatus("IDLE");
                setSession(null);
            } else if (s) {
                setSession(s);
                if (s.status === "IN_PROGRESS" && status !== "IN_PROGRESS") setStatus("IN_PROGRESS");
                if (s.status === "PAUSED" && status !== "PAUSED") setStatus("PAUSED");
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [status]);

    // ── Clock tick ──
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(dayjs().format("h:mm:ss A"));
            setNowDow(dayjs().day());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // ── Timer tick ──
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (status === "IN_PROGRESS") startTimer();
        else stopTimer();
        return stopTimer;
    }, [status, startTimer, stopTimer]);

    // Init elapsed from server on mount
    useEffect(() => {
        if (initialSession && initialSession.status === "IN_PROGRESS") {
            setElapsedSeconds(dayjs().diff(dayjs(initialSession.startedAt), "second"));
        }
    }, []);

    // ── Handlers ──

    const handleStart = async () => {
        if (!titleInput.trim()) { setTitleError(true); return; }
        setIsStarting(true);
        const res = await startFreeStudySession({ title: titleInput.trim() });
        if (res.success) {
            setSession({ id: res.id, title: titleInput.trim(), status: "IN_PROGRESS", startedAt: new Date().toISOString() });
            setStatus("IN_PROGRESS");
            setElapsedSeconds(0);
        }
        setIsStarting(false);
    };

    const handlePauseResume = async () => {
        if (status === "IN_PROGRESS") {
            await pauseFreeStudy();
            setStatus("PAUSED");
        } else {
            await resumeFreeStudy();
            setStatus("IN_PROGRESS");
        }
    };

    const handleEnd = async () => {
        setIsEnding(true);
        await endFreeStudy();
        stopTimer();
        setIsEnding(false);
        setShowEndConfirm(false);
        setSession(null);
        setStatus("IDLE");
        setTitleInput("");
        setElapsedSeconds(0);
    };

    // ── Note modal ──
    const openNoteModal = () => {
        setShowNoteModal(true);
        requestAnimationFrame(() => setNoteModalVisible(true));
    };
    const resetNoteModal = () => {
        setNoteModalVisible(false);
        setTimeout(() => {
            setNoteText("");
            setNoteError(false);
            images.forEach(img => URL.revokeObjectURL(img.preview));
            setImages([]);
            setShowNoteModal(false);
        }, 250);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setImages(prev => [...prev, ...files.map(file => ({
                file, preview: URL.createObjectURL(file), caption: ""
            }))]);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveImage = (i: number) => {
        setImages(prev => {
            const next = [...prev];
            URL.revokeObjectURL(next[i].preview);
            next.splice(i, 1);
            return next;
        });
    };

    const handleSaveNote = async () => {
        if (!noteText.trim() && images.length === 0) { setNoteError(true); return; }
        setIsUploading(true);
        let uploadedImages: { url: string; caption: string }[] = [];
        if (images.length > 0) {
            const results = await Promise.all(images.map(async img => {
                const fd = new FormData();
                fd.append("file", img.file);
                const res = await uploadImageToDrive(fd);
                return res.success ? { url: res.url, caption: img.caption } : null;
            }));
            uploadedImages = results.filter((r): r is { url: string; caption: string } => r !== null);
        }
        await addFreeStudyNote(noteText, uploadedImages);
        setIsUploading(false);
        resetNoteModal();
    };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="bg-[#FAFAF7] text-stone-800 font-sans">
            <div className="space-y-4">

                {/* ── Header ── */}
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-stone-400 mb-1">
                            TCAS 70 · เรียนนอกตาราง
                        </p>
                        <p className="text-5xl font-mono font-black text-stone-800 tabular-nums tracking-tight leading-none"
                            suppressHydrationWarning>
                            {currentTime}
                        </p>
                        <p className="text-sm text-stone-400 mt-2 font-medium">
                            {DAY_FULL_TH[nowDow]}ที่ {dayjs().format("D MMMM BBBB")}
                        </p>
                    </div>

                    {/* Status pill */}
                    {status === "IDLE" ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mt-1 bg-stone-100 text-stone-500 border-stone-200">
                            <span className="w-2 h-2 rounded-full bg-stone-400" />
                            ว่าง
                        </div>
                    ) : status === "IN_PROGRESS" ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mt-1 bg-violet-50 text-violet-700 border-violet-200">
                            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                            กำลังเรียน
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mt-1 bg-orange-50 text-orange-600 border-orange-200">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            พักเบรก
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* ── IDLE: Start card ── */}
                {/* ══════════════════════════════════════════════════════════ */}
                {status === "IDLE" && (
                    <div className="rounded-3xl bg-white shadow-[0_2px_24px_rgba(0,0,0,0.07)] border border-stone-100 overflow-hidden">
                        <div className="h-1.5 w-full bg-linear-to-r from-violet-400 to-fuchsia-300" />
                        <div className="p-6 space-y-5">
                            <div>
                                <h2 className="text-2xl font-black text-stone-800 leading-tight">
                                    เรียนอะไรวันนี้?
                                </h2>
                            </div>

                            {/* Preset chips */}
                            <div className="flex flex-wrap gap-2">
                                {SUBJECT_PRESETS.map(p => (
                                    <button
                                        key={p.label}
                                        onClick={() => {
                                            setTitleInput(p.label);
                                            setTitleError(false);
                                        }}
                                        className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                            titleInput === p.label
                                                ? "bg-violet-500 text-white border-violet-500 shadow-[0_2px_8px_rgba(139,92,246,0.35)]"
                                                : "bg-stone-50 text-stone-600 border-stone-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                                        }`}
                                    >
                                        <span>{p.emoji}</span>
                                        <span>{p.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Custom input */}
                            <div>
                                <input
                                    type="text"
                                    value={titleInput}
                                    onChange={e => {
                                        setTitleInput(e.target.value);
                                        if (titleError) setTitleError(false);
                                    }}
                                    onKeyDown={e => e.key === "Enter" && handleStart()}
                                    placeholder="หรือพิมพ์ชื่อวิชาเอง..."
                                    className={`w-full bg-stone-50 text-stone-800 text-sm rounded-2xl border px-4 py-3.5 outline-none transition-all placeholder:text-stone-300 ${
                                        titleError
                                            ? "border-rose-300 bg-rose-50/50 focus:border-rose-400"
                                            : "border-stone-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                                    }`}
                                />
                                {titleError && (
                                    <p className="text-xs text-rose-400 font-semibold mt-1.5 ml-1">
                                        ⚠️ กรุณาใส่ชื่อวิชาก่อนเริ่ม
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={handleStart}
                                disabled={isStarting}
                                className="cursor-pointer w-full bg-violet-500 hover:bg-violet-400 active:scale-[0.98] text-white font-black py-3.5 rounded-2xl text-base transition-all shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)] disabled:opacity-50"
                            >
                                {isStarting ? "กำลังเริ่ม..." : "เริ่มเรียนเลย →"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* ── IN_PROGRESS / PAUSED: Active session card ── */}
                {/* ══════════════════════════════════════════════════════════ */}
                {session && status !== "IDLE" && (
                    <div className="rounded-3xl bg-white shadow-[0_2px_24px_rgba(0,0,0,0.07)] border border-stone-100 overflow-hidden">
                        {/* Accent bar */}
                        <div className={`h-1.5 w-full ${
                            status === "IN_PROGRESS"
                                ? "bg-linear-to-r from-violet-400 to-fuchsia-300"
                                : "bg-linear-to-r from-orange-400 to-amber-300"
                        }`} />

                        <div className="p-6 space-y-5">
                            {/* Title row */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-stone-800 leading-tight">
                                        {session.title}
                                    </h2>
                                    <p className="text-xs text-stone-400 font-mono mt-1">
                                        เริ่ม {dayjs(session.startedAt).format("h:mm A")}
                                    </p>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                                    status === "IN_PROGRESS"
                                        ? "bg-violet-50 text-violet-600 border-violet-200"
                                        : "bg-orange-50 text-orange-600 border-orange-200"
                                }`}>
                                    {status === "IN_PROGRESS" ? "กำลังเรียน" : "พักเบรก"}
                                </span>
                            </div>

                            {/* Timer display */}
                            <div className={`rounded-2xl border px-6 py-5 text-center ${
                                status === "IN_PROGRESS"
                                    ? "border-violet-100 bg-violet-50"
                                    : "border-orange-100 bg-orange-50"
                            }`}>
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${
                                    status === "IN_PROGRESS" ? "text-violet-500" : "text-orange-500"
                                }`}>
                                    เวลาที่เรียนมา
                                </p>
                                <p className={`text-5xl font-mono font-black tabular-nums tracking-tight ${
                                    status === "IN_PROGRESS" ? "text-violet-700" : "text-orange-600"
                                }`} suppressHydrationWarning>
                                    {formatElapsed(elapsedSeconds)}
                                </p>

                                {/* Pause/Resume indicator */}
                                {status === "PAUSED" && (
                                    <p className="text-xs text-orange-400 font-semibold mt-2 animate-pulse">
                                        ⏸ นาฬิกาหยุดชั่วคราวแล้ว
                                    </p>
                                )}
                            </div>

                            {/* Action row */}
                            <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${
                                status === "IN_PROGRESS"
                                    ? "border-violet-100 bg-violet-50/50"
                                    : "border-orange-100 bg-orange-50/50"
                            }`}>
                                <div className="flex items-center gap-2.5">
                                    {status === "IN_PROGRESS" ? (
                                        <>
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-50" />
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
                                            </span>
                                            <span className="text-sm font-semibold text-violet-700">กำลังนับเวลาอยู่</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                                            <span className="text-sm font-semibold text-orange-600">พักอยู่</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {/* Note button */}
                                    <button
                                        onClick={openNoteModal}
                                        className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors border border-blue-200"
                                    >
                                        จดโน้ต
                                    </button>
                                    {/* Pause/Resume button */}
                                    <button
                                        onClick={handlePauseResume}
                                        className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors border border-stone-200"
                                    >
                                        {status === "IN_PROGRESS" ? "พัก" : "เรียนต่อ"}
                                    </button>
                                </div>
                            </div>

                            {/* End session button */}
                            <button
                                onClick={() => setShowEndConfirm(true)}
                                className="cursor-pointer w-full py-3 rounded-2xl text-sm font-bold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-[0_4px_16px_rgba(244,63,94,0.25)] transition-all"
                            >
                                จบการเรียน
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* ── End Confirm Modal ── */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {showEndConfirm && (
                <div
                    onClick={() => !isEnding && setShowEndConfirm(false)}
                    className="fixed inset-0 z-50 backdrop-blur-sm bg-black/20 flex items-center justify-center p-4"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-sm rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.15)] overflow-hidden"
                    >
                        <div className="h-1.5 w-full bg-linear-to-r from-rose-400 to-pink-300" />
                        <div className="p-6 text-center">
                            <div className="text-4xl mb-3">🏁</div>
                            <h3 className="text-lg font-black text-stone-800 mb-1">จบเซสชันนี้?</h3>
                            <p className="text-sm text-stone-400 mb-1">
                                <span className="font-semibold text-stone-600">{session?.title}</span>
                            </p>
                            <p className="text-2xl font-mono font-black text-stone-700 tabular-nums my-3"
                                suppressHydrationWarning>
                                {formatElapsed(elapsedSeconds)}
                            </p>
                            <p className="text-xs text-stone-400 mb-5">จะบันทึกเวลาเรียนทั้งหมดนี้</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowEndConfirm(false)}
                                    disabled={isEnding}
                                    className="cursor-pointer h-12 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-sm font-bold text-stone-500 transition-all disabled:opacity-50"
                                >
                                    ยังไม่จบ
                                </button>
                                <button
                                    onClick={handleEnd}
                                    disabled={isEnding}
                                    className="cursor-pointer h-12 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-black shadow-[0_4px_16px_rgba(244,63,94,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isEnding ? "กำลังบันทึก..." : "จบเลย"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* ── Note Modal ── */}
            {/* ══════════════════════════════════════════════════════════════ */}
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

                        {/* Header */}
                        <div className="flex items-start justify-between px-6 pt-5 pb-5 border-b border-stone-100">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-base">📝</div>
                                    <h3 className="text-lg font-black text-stone-800">จดบันทึกระหว่างเรียน</h3>
                                </div>
                                <p className="text-sm text-stone-400 mt-2 ml-10.5">
                                    {session?.title} · {formatElapsedReadable(elapsedSeconds)}
                                </p>
                            </div>
                            <button
                                onClick={resetNoteModal}
                                className="cursor-pointer shrink-0 w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center text-sm font-bold"
                            >✕</button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <textarea
                                    value={noteText}
                                    onChange={e => { setNoteText(e.target.value); if (noteError) setNoteError(false); }}
                                    placeholder="สูตรที่ลืม, จุดที่ยังไม่เข้าใจ, สิ่งที่ต้องทบทวน..."
                                    className={`w-full min-h-36 bg-stone-50 text-stone-800 text-sm leading-relaxed rounded-2xl border px-4 py-3.5 outline-none resize-none transition-all placeholder:text-stone-300 ${
                                        noteError
                                            ? "border-rose-300 focus:border-rose-400 bg-rose-50/50"
                                            : "border-stone-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                                    }`}
                                    autoFocus
                                />
                                <p className="text-[11px] text-stone-300 mt-1.5 text-right font-mono">{noteText.length}/1000</p>
                            </div>

                            {/* Image upload */}
                            <div>
                                <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-500 transition-colors"
                                >
                                    <span>📷</span>
                                    <span>แนบรูปภาพ</span>
                                    {images.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">{images.length}</span>
                                    )}
                                </button>
                            </div>

                            {/* Image previews */}
                            {images.length > 0 && (
                                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                                    {images.map((img, i) => (
                                        <div key={i} className="flex gap-3.5 rounded-2xl border border-stone-100 bg-stone-50 p-3">
                                            <div className="relative shrink-0">
                                                <Image
                                                    width={80} height={80}
                                                    src={img.preview} alt={`Preview ${i}`}
                                                    className="w-20 h-20 rounded-xl object-cover border border-stone-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(i)}
                                                    className="cursor-pointer absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-bold flex items-center justify-center shadow transition-colors"
                                                >✕</button>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">คำอธิบาย</p>
                                                <textarea
                                                    value={img.caption}
                                                    onChange={e => {
                                                        const next = [...images];
                                                        next[i].caption = e.target.value;
                                                        setImages(next);
                                                    }}
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

                        {/* Footer */}
                        <div className="grid grid-cols-2 gap-3 px-6 pb-6 pt-1">
                            <button
                                type="button"
                                onClick={resetNoteModal}
                                disabled={isUploading}
                                className="cursor-pointer h-12 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-sm font-bold text-stone-500 transition-all disabled:opacity-50"
                            >ยกเลิก</button>
                            <button
                                onClick={handleSaveNote}
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