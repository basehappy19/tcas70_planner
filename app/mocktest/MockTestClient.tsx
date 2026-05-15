'use client'
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import buddhistEra from "dayjs/plugin/buddhistEra";
import "dayjs/locale/th";
import { addMockTest } from "../actions/mocktest";

dayjs.extend(buddhistEra);
dayjs.locale("th");

type Subject = { id: number; name: string; fullScore: number };
type MockTestHistory = {
    id: number; score: number; timeSpent: number;
    testDate: Date; notes: string | null; subject: Subject;
};
type MockTestStat = {
    subjectId: number; subjectName: string; fullScore: number;
    min: number; max: number; avg: number; count: number;
};
type TestPhase = "setup" | "running" | "paused" | "scoring";

interface Props { subjects: Subject[]; history: MockTestHistory[]; stats: MockTestStat[]; }

const pad = (n: number) => n.toString().padStart(2, "0");
function formatTime(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

function scoreColor(pct: number) {
    if (pct >= 80) return "text-emerald-400";
    if (pct >= 50) return "text-amber-400";
    return "text-red-400";
}
function scoreBg(pct: number) {
    if (pct >= 80) return "bg-emerald-500/10 border-emerald-500/20";
    if (pct >= 50) return "bg-amber-500/10 border-amber-500/20";
    return "bg-red-500/10 border-red-500/20";
}

// Radial progress ring
function Ring({ pct, timeLeft, total, paused }: { pct: number; timeLeft: number; total: number; paused: boolean }) {
    const r = 80, circ = 2 * Math.PI * r;
    const progress = total > 0 ? timeLeft / total : 1;
    const stroke = paused ? "#f59e0b" : timeLeft < 300 ? "#f87171" : "#34d399";
    return (
        <svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0">
            <circle cx="100" cy="100" r={r} fill="none" stroke="#1f1f1f" strokeWidth="8" />
            <circle
                cx="100" cy="100" r={r} fill="none"
                stroke={stroke} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - progress)}
                transform="rotate(-90 100 100)"
                style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.3s" }}
            />
        </svg>
    );
}

export default function MockTestClient({ subjects, history, stats }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [phase, setPhase] = useState<TestPhase>("setup");
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");
    const [inputHours, setInputHours] = useState(1);
    const [inputMinutes, setInputMinutes] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [timeSpent, setTimeSpent] = useState(0);
    const [score, setScore] = useState("");
    const [notes, setNotes] = useState("");
    const [activeTab, setActiveTab] = useState<"history" | "stats">("history");

    const currentSubject = subjects.find(s => s.id === Number(selectedSubjectId));

    useEffect(() => {
        if (phase !== "running") return;
        const id = setInterval(() => {
            setTimeLeft(p => { if (p <= 1) { setPhase("scoring"); return 0; } return p - 1; });
            setTimeSpent(p => p + 1);
        }, 1000);
        return () => clearInterval(id);
    }, [phase]);

    const handleStart = () => {
        const t = inputHours * 3600 + inputMinutes * 60;
        if (!selectedSubjectId || t <= 0) return;
        setTotalTime(t); setTimeLeft(t); setTimeSpent(0); setPhase("running");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const fd = new FormData();
        fd.append("subjectId", String(selectedSubjectId));
        fd.append("score", score);
        fd.append("timeSpent", String(Math.ceil(timeSpent / 60)));
        fd.append("notes", notes);
        const res = await addMockTest(fd);
        if (res.success) {
            setPhase("setup"); setSelectedSubjectId(""); setScore(""); setNotes("");
        } else alert(res.message);
        setIsSubmitting(false);
    };

    const isAlarm = phase === "running" && timeLeft < 300;
    const pct = currentSubject ? (parseFloat(score) / currentSubject.fullScore) * 100 : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* ══ LEFT: Exam panel ══ */}
            <div className="lg:col-span-2 space-y-4">

                {/* Timer card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">

                    {/* ── Setup phase ── */}
                    {phase === "setup" && (
                        <div className="p-6">
                            <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-5">จำลองการสอบ</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block mb-1.5">วิชา</label>
                                    <select
                                        value={selectedSubjectId}
                                        onChange={e => setSelectedSubjectId(parseInt(e.target.value))}
                                        className="cursor-pointer w-full bg-neutral-950 text-white text-sm border border-neutral-800 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 outline-none transition-colors appearance-none"
                                    >
                                        <option  value="" disabled>-- เลือกรายวิชา --</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} · {s.fullScore} คะแนน</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block mb-1.5">เวลา</label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input type="number" min="0" max="10" value={inputHours}
                                                onChange={e => setInputHours(parseInt(e.target.value) || 0)}
                                                className="cursor-pointer w-full bg-neutral-950 text-white text-center text-lg font-bold border border-neutral-800 focus:border-emerald-500/60 rounded-xl px-3 py-3 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="absolute bottom-1.5 inset-x-0 text-center text-[10px] text-neutral-600 pointer-events-none">ชั่วโมง</span>
                                        </div>
                                        <span className="text-neutral-600 text-lg font-bold pb-4">:</span>
                                        <div className="relative flex-1">
                                            <input type="number" min="0" max="59" value={inputMinutes}
                                                onChange={e => setInputMinutes(parseInt(e.target.value) || 0)}
                                                className="w-full bg-neutral-950 text-white text-center text-lg font-bold border border-neutral-800 focus:border-emerald-500/60 rounded-xl px-3 py-3 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="absolute bottom-1.5 inset-x-0 text-center text-[10px] text-neutral-600 pointer-events-none">นาที</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleStart}
                                    disabled={!selectedSubjectId || (inputHours === 0 && inputMinutes === 0)}
                                    className={`${!selectedSubjectId || (inputHours === 0 && inputMinutes === 0) ? "disabled:" : "cursor-pointer"} w-full mt-2 py-3 rounded-xl text-sm font-bold transition-all bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-black`}
                                >
                                    เริ่มจับเวลา →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Running / Paused ── */}
                    {(phase === "running" || phase === "paused") && (
                        <div className="p-6 flex flex-col items-center">
                            {/* Subject pill */}
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-6">
                                {currentSubject?.name}
                            </span>

                            {/* Ring timer */}
                            <div className="relative w-[200px] h-[200px] flex items-center justify-center mb-6">
                                <Ring pct={0} timeLeft={timeLeft} total={totalTime} paused={phase === "paused"} />
                                <div className="relative z-10 text-center">
                                    <p className={`text-4xl font-black tabular-nums tracking-tight ${phase === "paused" ? "text-amber-400" : isAlarm ? "text-red-400" : "text-white"}`}>
                                        {formatTime(timeLeft)}
                                    </p>
                                    {phase === "paused" && (
                                        <p className="text-xs text-amber-500/70 mt-1 font-semibold tracking-wider uppercase">หยุดชั่วคราว</p>
                                    )}
                                    {isAlarm && phase === "running" && (
                                        <p className="text-xs text-red-400/70 mt-1 font-semibold tracking-wider uppercase animate-pulse">ใกล้หมดเวลา</p>
                                    )}
                                </div>
                            </div>

                            {/* Time spent */}
                            <p className="text-xs text-neutral-600 mb-5 font-mono">ผ่านไป {formatTime(timeSpent)}</p>

                            {/* Controls */}
                            <div className="flex gap-2 w-full">
                                {phase === "running" ? (
                                    <button onClick={() => setPhase("paused")}
                                        className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                                        พัก
                                    </button>
                                ) : (
                                    <button onClick={() => setPhase("running")}
                                        className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                                        ทำต่อ
                                    </button>
                                )}
                                <button onClick={() => setPhase("scoring")}
                                    className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-semibold bg-neutral-800 text-neutral-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/20 border border-neutral-700 transition-colors">
                                    ส่งข้อสอบ
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Scoring ── */}
                    {phase === "scoring" && (
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </div>
                                <p className="text-base font-bold text-white">หมดเวลาสอบ</p>
                                <p className="text-xs text-neutral-500 mt-0.5 font-mono">ใช้เวลา {Math.ceil(timeSpent / 60)} นาที · {currentSubject?.name}</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block mb-1.5">คะแนนที่ได้</label>
                                    <div className="relative">
                                        <input type="number" step="0.01" max={currentSubject?.fullScore ?? 999}
                                            required autoFocus value={score}
                                            onChange={e => setScore(e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-neutral-950 text-white text-2xl font-black border border-neutral-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 pr-24 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        {currentSubject && (
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-medium">
                                                / {currentSubject.fullScore}
                                            </span>
                                        )}
                                    </div>
                                    {/* % bar */}
                                    {score && currentSubject && (
                                        <div className="mt-2">
                                            <div className="flex justify-between text-[10px] mb-1">
                                                <span className={`font-bold ${scoreColor(pct)}`}>{pct.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block mb-1.5">บันทึก (ไม่บังคับ)</label>
                                    <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                                        placeholder="ข้อผิดพลาด สิ่งที่ต้องทบทวน..."
                                        className="w-full bg-neutral-950 text-white text-sm border border-neutral-800 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 outline-none resize-none placeholder:text-neutral-700"
                                    />
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={() => setPhase("setup")}
                                        className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm text-neutral-500 hover:text-white hover:bg-white/5 border border-neutral-800 transition-colors">
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

                {/* Stats card — desktop only, shows below timer */}
                <div className="hidden lg:block bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                    <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-4">สถิติรายวิชา</p>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {stats.length > 0 ? stats.map(stat => {
                            const avgPct = (stat.avg / stat.fullScore) * 100;
                            return (
                                <div key={stat.subjectId} className="bg-neutral-950/60 border border-neutral-800/60 rounded-xl p-3.5">
                                    <div className="flex justify-between items-start mb-2.5">
                                        <p className="text-sm font-semibold text-neutral-200">{stat.subjectName}</p>
                                        <span className="text-[10px] text-neutral-600">{stat.count} ครั้ง</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        {[
                                            { label: "MIN", val: stat.min, cls: "text-red-400" },
                                            { label: "AVG", val: stat.avg, cls: `${scoreColor(avgPct)}` },
                                            { label: "MAX", val: stat.max, cls: "text-emerald-400" },
                                        ].map(({ label, val, cls }) => (
                                            <div key={label} className="bg-neutral-900 rounded-lg py-2">
                                                <p className={`text-[9px] font-bold tracking-wider ${cls} opacity-60`}>{label}</p>
                                                <p className={`text-sm font-black mt-0.5 ${cls}`}>{val.toFixed(1)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {/* avg bar */}
                                    <div className="mt-2.5 h-1 bg-neutral-800 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${avgPct >= 80 ? "bg-emerald-400" : avgPct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                            style={{ width: `${Math.min(avgPct, 100)}%` }} />
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-xs text-neutral-700 text-center py-6">ยังไม่มีสถิติ</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ RIGHT: History + Stats tabs ══ */}
            <div className="lg:col-span-3">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-neutral-800">
                        {(["history", "stats"] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`cursor-pointer flex-1 py-3.5 text-sm font-semibold transition-colors ${activeTab === tab ? "text-white border-b-2 border-emerald-500 -mb-px bg-neutral-800/30" : "text-neutral-500 hover:text-neutral-300"}`}>
                                {tab === "history" ? `ประวัติ (${history.length})` : "สถิติ"}
                            </button>
                        ))}
                    </div>

                    <div className="p-5">
                        {/* History tab */}
                        {activeTab === "history" && (
                            <div className="space-y-3 max-h-150 overflow-y-auto pr-1">
                                {history.length > 0 ? history.map(item => {
                                    const p = (item.score / item.subject.fullScore) * 100;
                                    return (
                                        <div key={item.id} className={`border rounded-xl p-4 transition-all hover:border-neutral-700 ${scoreBg(p)}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-neutral-200">{item.subject.name}</p>
                                                    <p className="text-[11px] text-neutral-600 font-mono mt-0.5">
                                                        {dayjs(item.testDate).format("D MMM BBBB · h:mm A")} · {item.timeSpent} นาที
                                                    </p>
                                                    {item.notes && (
                                                        <p className="text-xs text-neutral-500 mt-2 border-l-2 border-neutral-700 pl-2 italic line-clamp-2">
                                                            {item.notes}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`text-2xl font-black tabular-nums ${scoreColor(p)}`}>{item.score}</span>
                                                    <p className="text-[10px] text-neutral-600 mt-0.5">/ {item.subject.fullScore}</p>
                                                    <p className={`text-[10px] font-bold mt-0.5 ${scoreColor(p)}`}>{p.toFixed(0)}%</p>
                                                </div>
                                            </div>
                                            {/* Score bar */}
                                            <div className="mt-3 h-1 bg-black/30 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${p >= 80 ? "bg-emerald-400" : p >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                                    style={{ width: `${Math.min(p, 100)}%` }} />
                                            </div>
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

                        {/* Stats tab */}
                        {activeTab === "stats" && (
                            <div className="space-y-3">
                                {stats.length > 0 ? stats.map(stat => {
                                    const avgPct = (stat.avg / stat.fullScore) * 100;
                                    return (
                                        <div key={stat.subjectId} className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-sm font-bold text-neutral-200">{stat.subjectName}</p>
                                                    <p className="text-[11px] text-neutral-600 mt-0.5">เต็ม {stat.fullScore} · สอบ {stat.count} ครั้ง</p>
                                                </div>
                                                <span className={`text-lg font-black ${scoreColor(avgPct)}`}>{avgPct.toFixed(0)}%</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 text-center mb-3">
                                                {[
                                                    { label: "ต่ำสุด", val: stat.min, cls: "text-red-400 bg-red-500/8 border-red-500/15" },
                                                    { label: "เฉลี่ย", val: stat.avg, cls: `${scoreColor(avgPct)} bg-white/[0.03] border-neutral-800` },
                                                    { label: "สูงสุด", val: stat.max, cls: "text-emerald-400 bg-emerald-500/8 border-emerald-500/15" },
                                                ].map(({ label, val, cls }) => (
                                                    <div key={label} className={`border rounded-lg py-2.5 ${cls}`}>
                                                        <p className="text-[10px] opacity-60 font-medium">{label}</p>
                                                        <p className="text-base font-black mt-0.5">{val.toFixed(1)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${avgPct >= 80 ? "bg-emerald-400" : avgPct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                                    style={{ width: `${Math.min(avgPct, 100)}%` }} />
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-16">
                                        <p className="text-sm text-neutral-600">ยังไม่มีสถิติ</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}