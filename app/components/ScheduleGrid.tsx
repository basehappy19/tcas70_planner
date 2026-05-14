'use client'
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import buddhistEra from "dayjs/plugin/buddhistEra";
import "dayjs/locale/th"; // โหลดภาษาไทย
import { updateSchedule, getScheduleHistory } from "../actions/schedule";

// ตั้งค่าใช้งาน Dayjs
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.extend(buddhistEra);
dayjs.locale("th"); // เซ็ตให้เป็นภาษาไทย

type ScheduleItem = {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    dayOfWeek?: number;
};

// แก้ไขชื่อให้ตรงกับที่ API ส่งมา (actionLogs)
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
    }[];
};

export default function ScheduleGrid({ item, isToday }: { item: ScheduleItem, isToday?: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isCurrentTimeSlot, setIsCurrentTimeSlot] = useState(false);
    const [historyData, setHistoryData] = useState<StudyLogWithActions[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    const [formData, setFormData] = useState({
        title: item.title,
        startTime: item.startTime,
        endTime: item.endTime
    });

    useEffect(() => {
        if (!isToday) return;

        const checkTime = () => {
            const now = dayjs();
            const start = dayjs(item.startTime, "HH:mm");
            const end = dayjs(item.endTime, "HH:mm");

            const todayStart = now.hour(start.hour()).minute(start.minute()).second(0);
            const todayEnd = now.hour(end.hour()).minute(end.minute()).second(0);

            setIsCurrentTimeSlot(now.isAfter(todayStart) && now.isBefore(todayEnd));
        };

        checkTime();
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, [isToday, item.startTime, item.endTime]);

    const formatTo12Hour = (time24: string) => {
        if (!time24) return "";
        return dayjs(time24, "HH:mm").format("hh:mm A");
    };

    const getActionLabel = (actionCode: string) => {
        const labels: Record<string, string> = {
            START_ON_TIME: "เริ่มเรียนตรงเวลา",
            START_LATE: "เริ่มเรียนช้า",
            PAUSE: "พักเบรก",
            RESUME: "เรียนต่อ",
            TAKE_NOTE: "จดโน้ต",
            END_SESSION: "จบการเรียน",
        };
        return labels[actionCode] || actionCode;
    };

    const handleUpdate = async () => {
        const res = await updateSchedule(item.id, formData);
        if (res.success) {
            setIsEditing(false);
        } else {
            alert(res.message);
        }
    };

    const handleOpenHistory = async () => {
        setShowHistory(true);
        setLoadingHistory(true);
        const res = await getScheduleHistory(item.id);
        if (res.success && res.data) {
            setHistoryData(res.data);
        }
        setLoadingHistory(false);
    };

    return (
        <>
            <div 
                className={`group relative p-4 rounded-2xl transition-all shadow-lg 
                    ${isCurrentTimeSlot 
                        ? 'bg-emerald-900/40 border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)] scale-[1.02]' 
                        : isToday 
                            ? 'bg-[#1e1e1e] border-2 border-neutral-700 hover:border-emerald-500/50' 
                            : 'bg-[#1e1e1e] border border-gray-800 opacity-70 hover:opacity-100'
                    }
                `}
            >
                {isCurrentTimeSlot && (
                    <div className="absolute -top-3 -right-2 bg-emerald-500 text-black text-[10px] font-black px-3 py-1 rounded-full animate-pulse shadow-lg">
                        NOW
                    </div>
                )}

                <div className="text-[10px] text-gray-500 font-mono mb-1">
                    {formatTo12Hour(item.startTime)} - {formatTo12Hour(item.endTime)}
                </div>
                <div className="text-sm font-bold text-gray-200 line-clamp-2 leading-snug">{item.title}</div>
                
                <div className="mt-3 flex gap-2">
                    <button 
                        onClick={handleOpenHistory}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-xs text-gray-300 py-1.5 rounded-lg font-medium transition-colors border border-white/5 cursor-pointer"
                    >
                        ดูประวัติ
                    </button>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="px-3 bg-white/5 hover:bg-white/10 text-xs text-gray-300 py-1.5 rounded-lg transition-colors border border-white/5 cursor-pointer"
                        title="แก้ไข"
                    >
                        ✏️
                    </button>
                </div>
            </div>

            {/* Modal แก้ไข */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-100 p-4 font-sans">
                    <div className="bg-[#222] border border-gray-700 w-full max-w-md rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 text-white">แก้ไขตารางเรียน</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">ชื่อวิชา / ภารกิจ</label>
                                <input 
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full bg-black text-white border border-gray-800 rounded-xl p-3 mt-1 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">เวลาเริ่ม</label>
                                    <input 
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                        className="w-full bg-black text-white border border-gray-800 rounded-xl p-3 mt-1 focus:border-emerald-500 outline-none scheme-dark"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">เวลาจบ</label>
                                    <input 
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                                        className="w-full bg-black text-white border border-gray-800 rounded-xl p-3 mt-1 focus:border-emerald-500 outline-none scheme-dark"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setIsEditing(false)} className="flex-1 py-3 text-gray-500 hover:text-white transition-colors font-bold cursor-pointer">ยกเลิก</button>
                            <button onClick={handleUpdate} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold text-white transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer">บันทึกข้อมูล</button>
                        </div>
                    </div>
                </div>
            )}

            {showHistory && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-100 p-4 font-sans">
                    <div className="bg-[#1a1a1a] border border-neutral-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">ประวัติการเข้าเรียน</h2>
                                <p className="text-xs text-emerald-400 mt-1">{item.title}</p>
                            </div>
                            <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white p-2 cursor-pointer">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-4">
                            {loadingHistory ? (
                                <div className="text-center py-10 text-neutral-500">กำลังโหลด...</div>
                            ) : historyData.length > 0 ? (
                                historyData.map((log) => (
                                    <div key={log.id} className="bg-black/50 border border-neutral-800 p-4 rounded-2xl">
                                        <div className="flex justify-between items-start mb-3 border-b border-neutral-800 pb-3">
                                            <div>
                                                <div className="font-bold text-gray-200">
                                                    {dayjs(log.date).format('D MMMM BBBB')}
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-1">
                                                    เริ่มจริง: {log.actualStartAt ? dayjs(log.actualStartAt).format('HH:mm น.') : '-'} 
                                                    {log.delayMinutes > 0 && <span className="text-red-400 ml-2">(ช้าไป {log.delayMinutes} นาที)</span>}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${
                                                log.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                log.status === 'MISSED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                                {log.status}
                                            </span>
                                        </div>

                                        {log.actionLogs && log.actionLogs.length > 0 ? (
                                            <ul className="space-y-2 mt-2">
                                                {log.actionLogs.map((actionLog) => (
                                                    <li key={actionLog.id} className="text-xs flex gap-3 text-gray-400 items-start">
                                                        <span className="text-neutral-600 font-mono w-12 pt-0.5">
                                                            {dayjs(actionLog.time).format('HH:mm')}
                                                        </span>
                                                        <span className="flex-1">
                                                            <span className="text-gray-300 font-medium">
                                                                {getActionLabel(actionLog.action)}
                                                            </span>
                                                            {actionLog.note && <span className="text-neutral-500 ml-1 block mt-0.5 border-l-2 border-neutral-700 pl-2">{`"`}{actionLog.note}{`"`}</span>}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-xs text-neutral-600 italic">ไม่มีบันทึกกิจกรรมย่อย</div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 border border-dashed border-neutral-800 rounded-2xl">
                                    <p className="text-sm text-neutral-500">ยังไม่เคยมีประวัติการเรียนวิชานี้</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}