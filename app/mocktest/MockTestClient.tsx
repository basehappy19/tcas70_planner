'use client'
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import buddhistEra from "dayjs/plugin/buddhistEra";
import "dayjs/locale/th";
import { addMockTest } from "../actions/mocktest";

dayjs.extend(buddhistEra);
dayjs.locale("th");

type Subject = {
    id: number;
    name: string;
    fullScore: number;
};

type MockTestHistory = {
    id: number;
    score: number;
    timeSpent: number;
    testDate: Date;
    notes: string | null;
    subject: Subject;
};

type MockTestStat = {
    subjectId: number;
    subjectName: string;
    fullScore: number;
    min: number;
    max: number;
    avg: number;
    count: number;
};

interface Props {
    subjects: Subject[];
    history: MockTestHistory[];
    stats: MockTestStat[];
}

type TestPhase = "setup" | "running" | "paused" | "scoring";

export default function MockTestClient({ subjects, history, stats }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Timer States
    const [phase, setPhase] = useState<TestPhase>("setup");
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");
    const [inputHours, setInputHours] = useState<number>(1);
    const [inputMinutes, setInputMinutes] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState<number>(0); // วินาที
    const [timeSpent, setTimeSpent] = useState<number>(0); // วินาที
    
    // Scoring States
    const [score, setScore] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    // หาคะแนนเต็มของวิชาที่กำลังเลือกอยู่
    const currentSubject = subjects.find(s => s.id === Number(selectedSubjectId));
    const currentSubjectFullScore = currentSubject?.fullScore || 0;

    // ระบบจับเวลา
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (phase === "running") {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setPhase("scoring"); 
                        return 0;
                    }
                    return prev - 1;
                });
                setTimeSpent((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [phase]);

    // แปลงวินาทีเป็น HH:MM:SS
    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStartTest = () => {
        const totalSeconds = (inputHours * 3600) + (inputMinutes * 60);
        if (totalSeconds <= 0) {
            alert("กรุณาตั้งเวลาให้มากกว่า 0 นาที");
            return;
        }
        setTimeLeft(totalSeconds);
        setTimeSpent(0);
        setPhase("running");
    };

    const handleSubmitScore = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const formData = new FormData();
        formData.append("subjectId", String(selectedSubjectId));
        formData.append("score", score);
        // แปลงเวลาที่ใช้ไปจากวินาทีเป็นนาที (ปัดขึ้น)
        formData.append("timeSpent", String(Math.ceil(timeSpent / 60)));
        formData.append("notes", notes);
        
        const res = await addMockTest(formData);
        if (res.success) {
            // Reset ทั้งหมดกลับไปหน้า Setup
            setPhase("setup");
            setSelectedSubjectId("");
            setScore("");
            setNotes("");
            alert("บันทึกคะแนนเรียบร้อย!");
        } else {
            alert(res.message);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-1 space-y-8">
                
                <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-neutral-800 shadow-xl overflow-hidden relative">
                    
                    {phase === "setup" && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span>📝</span> จำลองการสอบ
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">วิชาที่สอบ</label>
                                    <select 
                                        required
                                        value={selectedSubjectId}
                                        onChange={(e) => setSelectedSubjectId(parseInt(e.target.value))}
                                        className="w-full bg-black text-white border border-gray-800 rounded-xl p-3 mt-1 focus:border-emerald-500 outline-none"
                                    >
                                        <option value="" disabled>-- เลือกวิชา --</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} (เต็ม {s.fullScore})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">ตั้งเวลา</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <input 
                                                    type="number" min="0" max="10"
                                                    value={inputHours}
                                                    onChange={(e) => setInputHours(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-black text-white border border-gray-800 rounded-xl p-3 focus:border-emerald-500 outline-none pr-10 text-center text-lg"
                                                />
                                                <span className="absolute right-3 top-3.5 text-xs text-neutral-500">ชม.</span>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="relative">
                                                <input 
                                                    type="number" min="0" max="59"
                                                    value={inputMinutes}
                                                    onChange={(e) => setInputMinutes(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-black text-white border border-gray-800 rounded-xl p-3 focus:border-emerald-500 outline-none pr-10 text-center text-lg"
                                                />
                                                <span className="absolute right-3 top-3.5 text-xs text-neutral-500">นาที</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleStartTest}
                                    disabled={!selectedSubjectId}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-4 cursor-pointer"
                                >
                                    เริ่มจับเวลา
                                </button>
                            </div>
                        </div>
                    )}

                    {(phase === "running" || phase === "paused") && (
                        <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center justify-center py-4 text-center">
                            <span className="text-emerald-400 text-sm font-bold bg-emerald-500/10 px-3 py-1 rounded-full mb-4">
                                {currentSubject?.name}
                            </span>
                            
                            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                                <div className={`absolute inset-0 border-4 rounded-full ${phase === 'paused' ? 'border-yellow-500/30' : timeLeft < 300 ? 'border-red-500/50 animate-pulse' : 'border-emerald-500/30'}`}></div>
                                <div className={`text-5xl font-black tabular-nums tracking-tighter ${phase === 'paused' ? 'text-yellow-400' : timeLeft < 300 ? 'text-red-400' : 'text-white'}`}>
                                    {formatTime(timeLeft)}
                                </div>
                                {phase === "paused" && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-black/50 backdrop-blur-sm w-full h-full flex items-center justify-center rounded-full">
                                        หยุด
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 w-full">
                                {phase === "running" ? (
                                    <button 
                                        onClick={() => setPhase("paused")}
                                        className="flex-1 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 border border-yellow-500/50 font-bold py-3 rounded-xl transition-colors cursor-pointer"
                                    >
                                        พักเบรก
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setPhase("running")}
                                        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500 font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
                                    >
                                        ทำต่อ
                                    </button>
                                )}
                                <button 
                                    onClick={() => setPhase("scoring")}
                                    className="flex-1 bg-neutral-800 text-white hover:bg-red-500/80 font-bold py-3 rounded-xl transition-colors cursor-pointer"
                                >
                                    ส่งข้อสอบ
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Phase 3: Scoring */}
                    {phase === "scoring" && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-black text-emerald-400 mb-1">หมดเวลาสอบ!</h2>
                                <p className="text-neutral-400 text-sm">
                                    ใช้เวลาไป {Math.ceil(timeSpent / 60)} นาที
                                </p>
                            </div>

                            <form onSubmit={handleSubmitScore} className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">คะแนนที่ได้ ({currentSubject?.name})</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            max={currentSubjectFullScore || 999}
                                            required
                                            value={score}
                                            onChange={(e) => setScore(e.target.value)}
                                            className="w-full bg-black text-white border border-gray-800 rounded-xl p-4 mt-1 focus:border-emerald-500 outline-none text-xl font-bold"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                        {currentSubjectFullScore > 0 && (
                                            <span className="absolute right-4 top-5 text-neutral-500 font-bold">
                                                / {currentSubjectFullScore}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">บันทึกช่วยจำ (ข้อผิดพลาด ฯลฯ)</label>
                                    <textarea 
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full bg-black text-white border border-gray-800 rounded-xl p-3 mt-1 focus:border-emerald-500 outline-none resize-none"
                                        placeholder=""
                                    ></textarea>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button 
                                        type="button"
                                        onClick={() => setPhase("setup")}
                                        className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="flex-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                                    >
                                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกผลสอบ"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* สถิติภาพรวม */}
                <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-neutral-800 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span>📊</span> สถิติรายวิชา
                    </h2>
                    
                    <div className="space-y-3 max-h-75 overflow-y-auto scrollbar-hide pr-1">
                        {stats.length > 0 ? (
                            stats.map(stat => (
                                <div key={stat.subjectId} className="bg-black/50 p-4 rounded-2xl border border-neutral-800">
                                    <div className="flex justify-between items-center mb-3 border-b border-neutral-800 pb-2">
                                        <h3 className="font-bold text-emerald-400">{stat.subjectName}</h3>
                                        <span className="text-xs text-neutral-500">สอบไปแล้ว {stat.count} ครั้ง</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                                            <div className="text-[10px] text-red-400 font-bold uppercase">MIN</div>
                                            <div className="text-sm font-black text-white mt-1">{stat.min.toFixed(2)}</div>
                                        </div>
                                        <div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
                                            <div className="text-[10px] text-yellow-400 font-bold uppercase">AVG</div>
                                            <div className="text-sm font-black text-white mt-1">{stat.avg.toFixed(2)}</div>
                                        </div>
                                        <div className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20">
                                            <div className="text-[10px] text-emerald-400 font-bold uppercase">MAX</div>
                                            <div className="text-sm font-black text-white mt-1">{stat.max.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-neutral-600 text-sm">ยังไม่มีสถิติ</div>
                        )}
                    </div>
                </div>

            </div>

            {/* คอลัมน์ขวา: ประวัติย้อนหลัง (เหมือนเดิม) */}
            <div className="lg:col-span-2">
                <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-neutral-800 shadow-xl h-full">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span>🕒</span> ประวัติการทำย้อนหลัง
                    </h2>

                    <div className="space-y-4">
                        {history.length > 0 ? (
                            history.map(item => {
                                const percentage = (item.score / item.subject.fullScore) * 100;
                                let scoreColor = "text-red-400";
                                if (percentage >= 80) scoreColor = "text-emerald-400";
                                else if (percentage >= 50) scoreColor = "text-yellow-400";

                                return (
                                    <div key={item.id} className="group flex flex-col md:flex-row gap-4 bg-black/40 p-4 rounded-2xl border border-neutral-800 hover:border-emerald-500/30 transition-all">
                                        
                                        <div className="shrink-0 text-center md:text-left min-w-30">
                                            <div className="text-xs text-neutral-500 font-mono mb-1">
                                                {dayjs(item.testDate).format('D MMM BBBB')}
                                            </div>
                                            <div className="text-xs text-neutral-600 font-mono">
                                                {dayjs(item.testDate).format('HH:mm น.')}
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-gray-200">{item.subject.name}</h3>
                                                <div className="text-right">
                                                    <span className={`text-xl font-black ${scoreColor}`}>
                                                        {item.score}
                                                    </span>
                                                    <span className="text-xs text-neutral-500 ml-1">
                                                        / {item.subject.fullScore}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 mt-2 text-xs">
                                                <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-300 flex items-center gap-1">
                                                    ⏱️ ใช้เวลา {item.timeSpent} นาที
                                                </span>
                                            </div>

                                            {item.notes && (
                                                <div className="mt-3 p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-xs text-neutral-400">
                                                    <span className="text-emerald-500 font-bold mr-2">Note:</span> 
                                                    {item.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-20 border border-dashed border-neutral-800 rounded-2xl">
                                <p className="text-neutral-500">ยังไม่มีประวัติการทำ Mock Test</p>
                                <p className="text-xs text-neutral-600 mt-2">ลุยเลย! จำลองสอบครั้งแรกของคุณที่แท็บด้านซ้าย</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}