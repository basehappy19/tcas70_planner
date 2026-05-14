'use client'
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { addActionLogToDB, createStudySession, finishStudySession } from "@/app/actions/study";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);

type Schedule = {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
};

const formatTo12Hour = (time24: string) => {
    if (!time24) return "";
    return dayjs(time24, "HH:mm").format("hh:mm A");
};

export default function HeroSection({
    id, title, startTime, endTime, initialTime
}: Partial<Schedule> & { initialTime: string }) {
    const [currentTime, setCurrentTime] = useState(initialTime);
    const [status, setStatus] = useState<"IDLE" | "STUDYING" | "PAUSED">("IDLE");
    const [isSaving, setIsSaving] = useState(false);
    const [canEndSession, setCanEndSession] = useState(false);

    const [showLateModal, setShowLateModal] = useState(false);
    const [lateMinutes, setLateMinutes] = useState(0);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteText, setNoteText] = useState("");

    useEffect(() => {
        const timer = setInterval(() => {
            const now = dayjs();
            setCurrentTime(now.format("hh:mm:ss A"));

            if (endTime) {
                const [endHour, endMinute] = endTime.split(":");
                const scheduledEnd = dayjs().hour(Number(endHour)).minute(Number(endMinute)).second(0);
                setCanEndSession(now.isSameOrAfter(scheduledEnd));
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [endTime]);

    const handleStartStudy = async () => {
        if (!id) return;
        const res = await createStudySession({ scheduleId: id });
        if (res.success) {
            setStatus("STUDYING");
            if (res.delayMinutes && res.delayMinutes > 0) {
                setLateMinutes(res.delayMinutes);
                setShowLateModal(true);
            }
        }
    };

    const handleEndSession = async () => {
        setIsSaving(true);
        await addActionLogToDB("END_SESSION");
        const res = await finishStudySession();
        setIsSaving(false);

        if (res.success) {
            setStatus("IDLE");
            window.location.reload();
        }
    };

    // 🌟 UI: โหมด Standby (ไม่มีตารางเรียน)
    if (!title || !id) {
        return (
            <div className="flex flex-col items-center justify-center py-12 min-h-[50vh]">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">TCAS 70 Planner</h1>
                    <p
                        className="text-3xl font-mono text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        suppressHydrationWarning
                    >
                        {currentTime}
                    </p>
                </div>

                <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700"></div>
                    <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700"></div>

                    <div className="text-7xl mb-6 relative z-10 drop-shadow-2xl">☕</div>
                    <h2 className="text-3xl font-black text-white mb-3 relative z-10">เวลาพักผ่อน</h2>
                    <p className="text-neutral-400 text-lg relative z-10">ขณะนี้ไม่มีตารางเรียน</p>
                </div>
            </div>
        );
    }

    // 🌟 UI: โหมด Active (มีตารางเรียน)
    return (
        <div className="flex flex-col items-center py-10">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">TCAS 70 Command Center</h1>
                <p className="text-3xl font-mono text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" suppressHydrationWarning>
                    {currentTime}
                </p>
            </div>

            <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="text-center mb-8">
                    <span className="inline-block px-3 py-1 bg-neutral-800 text-neutral-400 text-xs uppercase tracking-widest rounded-full mb-4 font-semibold">
                        Current Session
                    </span>
                    <h3 className="text-3xl font-black text-white">{title}</h3>
                </div>

                <div className="flex justify-center items-center gap-4 mb-10 font-mono text-lg">
                    <div className="bg-neutral-950 px-6 py-3 rounded-2xl border border-neutral-800 text-gray-200">
                        {formatTo12Hour(startTime || "")}
                    </div>
                    <span className="text-neutral-500 font-sans">to</span>
                    <div className="bg-neutral-950 px-6 py-3 rounded-2xl border border-neutral-800 text-gray-200">
                        {formatTo12Hour(endTime || "")}
                    </div>
                </div>

                {status === "IDLE" ? (
                    <button
                        onClick={handleStartStudy}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black py-4 rounded-2xl text-xl transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)]"
                    >
                        เริ่มติว
                    </button>
                ) : (
                    <div className="space-y-4">
                        <div className={`flex justify-between items-center p-5 rounded-2xl border ${status === "STUDYING" ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                            <div className="flex items-center gap-3">
                                <span className={`relative flex h-3 w-3`}>
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === "STUDYING" ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${status === "STUDYING" ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                </span>
                                <span className={`font-bold text-lg ${status === "STUDYING" ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {status === "STUDYING" ? "กำลังเรียน" : "กำลังพักเบรก"}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowNoteModal(true)}
                                    className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                                >
                                    จดโน้ต
                                </button>
                                <button
                                    onClick={() => {
                                        const newStatus = status === "STUDYING" ? "PAUSED" : "STUDYING";
                                        setStatus(newStatus);
                                        addActionLogToDB(newStatus === "STUDYING" ? "RESUME" : "PAUSE");
                                    }}
                                    className="bg-neutral-800 text-white hover:bg-neutral-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                                >
                                    {status === "STUDYING" ? "พักเบรก" : "เรียนต่อ"}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleEndSession}
                            disabled={!canEndSession || isSaving}
                            className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${canEndSession && !isSaving
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500 hover:text-white cursor-pointer'
                                : 'bg-neutral-900 border border-neutral-800 text-neutral-600 cursor-not-allowed'
                                }`}
                        >
                            {isSaving ? "กำลังบันทึกข้อมูล..." : canEndSession ? "จบชั่วโมงการเรียน" : "ยังไม่ถึงเวลาจบเซสชัน"}
                        </button>
                    </div>
                )}
            </div>

            {/* Late Modal */}
            {showLateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
                    <div className="bg-neutral-900 border border-rose-500/30 p-10 rounded-3xl max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⏱️</div>
                        <h2 className="text-2xl font-bold text-white mb-2">คุณเข้าสาย!</h2>
                        <p className="text-rose-400 text-4xl font-mono font-black mb-8">{lateMinutes} <span className="text-lg">นาที</span></p>
                        <button
                            onClick={() => {
                                setShowLateModal(false);
                                addActionLogToDB("ACKNOWLEDGE_LATE", `ยอมรับว่าเข้าช้า ${lateMinutes} นาที`);
                            }}
                            className="w-full bg-white text-neutral-950 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            ยอมรับและลุยต่อ
                        </button>
                    </div>
                </div>
            )}

            {/* Note Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
                    <div className="bg-neutral-900 p-6 rounded-3xl max-w-md w-full border border-neutral-700 shadow-2xl">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <span>📝</span> จดบันทึกระหว่างเรียน
                        </h3>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="จดสูตรที่ลืม, ข้อผิดพลาด, หรือสิ่งที่ต้องทบทวน..."
                            className="w-full h-40 bg-neutral-950 text-white p-4 rounded-2xl border border-neutral-800 focus:border-blue-500 outline-none resize-none mb-4 placeholder:text-neutral-600"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setNoteText(""); setShowNoteModal(false); }}
                                className="flex-1 py-3 rounded-xl text-neutral-400 font-medium hover:text-white hover:bg-neutral-800 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => {
                                    if (noteText.trim()) addActionLogToDB("TAKE_NOTE", noteText);
                                    setNoteText("");
                                    setShowNoteModal(false);
                                }}
                                className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white hover:bg-blue-500 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                            >
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}