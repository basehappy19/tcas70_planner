'use client'

import { useState, useTransition } from "react";
import dayjs from "@/lib/dayjs";
import { 
    deleteStudyLog, 
    updateActionNote, 
    generateAISummary 
} from "@/features/study/services/history";
import { useRouter } from "next/navigation";
import { toast } from "@/utils/toast";
import { formatTime12 } from "@/utils/format";

interface HistoryItem {
    id: number;
    type: 'SCHEDULED' | 'FREE';
    title: string;
    date: Date;
    startTime: Date | null;
    status: string;
    aiSummary: string | null;
    actionLogs: any[];
    schedule: any | null;
}

export default function HistoryClient({ initialHistory }: { initialHistory: any[] }) {
    const [search, setSearch] = useState("");
    const [isPending, startTransition] = useTransition();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const router = useRouter();

    const filteredHistory = initialHistory.filter(item => 
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.actionLogs.some((al: any) => al.note?.toLowerCase().includes(search.toLowerCase()))
    );

    // Group items by date
    const groupedHistory: Record<string, HistoryItem[]> = filteredHistory.reduce((acc, item) => {
        const dateKey = dayjs(item.date).format("YYYY-MM-DD");
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
    }, {} as Record<string, HistoryItem[]>);

    const sortedDates = Object.keys(groupedHistory).sort((a, b) => dayjs(b).unix() - dayjs(a).unix());

    const handleDelete = async (id: number, type: 'SCHEDULED' | 'FREE') => {
        if (!confirm("คุณแน่ใจหรือไม่ที่จะลบบันทึกนี้?")) return;
        const res = await deleteStudyLog(id, type);
        if (res.success) {
            toast.success("ลบบันทึกเรียบร้อยแล้ว");
            router.refresh();
        } else {
            toast.error("เกิดข้อผิดพลาดในการลบ");
        }
    };

    const handleUpdateNote = async (actionLogId: number, type: 'SCHEDULED' | 'FREE') => {
        const res = await updateActionNote(actionLogId, type, editValue);
        if (res.success) {
            toast.success("อัปเดตโน๊ตเรียบร้อยแล้ว");
            setEditingNoteId(null);
            router.refresh();
        } else {
            toast.error("เกิดข้อผิดพลาดในการอัปเดต");
        }
    };

    const handleGenerateAI = async (id: number, type: 'SCHEDULED' | 'FREE') => {
        const toastId = toast.loading("กำลังให้ AI สรุปบทเรียน...");
        try {
            const res = await generateAISummary(id, type);
            // Dismiss loading toast manually if the library doesn't handle auto-dismiss on success/error
            // (Standard sonner toast.loading returns an ID that can be used for dismissal or replacement)
            // But since our stub/wrapper might vary, I'll use success/error to notify.
            if (res.success) {
                toast.success("AI สรุปเรียบร้อยแล้ว");
                router.refresh();
            } else {
                toast.error("เกิดข้อผิดพลาดในการสรุป");
            }
        } catch (e) {
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-emerald-500 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="ค้นหาวัน, วิชา หรือโน๊ตที่เคยจดไว้..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white border-2 border-stone-100 rounded-3xl py-4 pl-12 pr-6 text-stone-800 placeholder:text-stone-400 font-bold focus:outline-none focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm group-hover:shadow-md"
                />
            </div>

            {/* History List */}
            <div className="space-y-12">
                {sortedDates.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-stone-200">
                        <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                                <line x1="9" y1="9" x2="9.01" y2="9" />
                                <line x1="15" y1="9" x2="15.01" y2="9" />
                            </svg>
                        </div>
                        <p className="text-stone-400 font-bold text-lg">ไม่พบข้อมูลที่ค้นหา</p>
                    </div>
                ) : (
                    sortedDates.map((dateKey) => {
                        const items = groupedHistory[dateKey];
                        const dateObj = dayjs(dateKey);
                        const isToday = dateKey === dayjs().format("YYYY-MM-DD");

                        return (
                            <div key={dateKey} className="relative">
                                {/* Date Header */}
                                <div className="sticky top-4 z-20 mb-6 flex items-center gap-4">
                                    <div className={`px-5 py-2 rounded-2xl shadow-sm border-2 flex items-center gap-3 ${
                                        isToday 
                                        ? "bg-emerald-500 border-emerald-400 text-white" 
                                        : "bg-white border-stone-100 text-stone-800"
                                    }`}>
                                        <span className="text-xs font-black uppercase tracking-widest opacity-80">
                                            {dateObj.format("ddd")}
                                        </span>
                                        <span className="text-lg font-black">
                                            {dateObj.format("DD MMM YYYY")}
                                        </span>
                                        {isToday && (
                                            <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">Today</span>
                                        )}
                                    </div>
                                    <div className="flex-1 h-0.5 bg-stone-100" />
                                    <div className="text-xs font-bold text-stone-300 uppercase tracking-widest">
                                        {items.length} SESSIONS
                                    </div>
                                </div>

                                {/* Items Container for the day */}
                                <div className="grid gap-4 ml-4 md:ml-8 border-l-4 border-stone-50 pl-6 md:pl-10 relative">
                                    {items.map((item) => {
                                        const uniqueId = `${item.type}-${item.id}`;
                                        const isExpanded = expandedId === uniqueId;
                                        
                                        return (
                                            <div 
                                                key={uniqueId}
                                                className={`bg-white rounded-[32px] border-2 transition-all duration-300 overflow-hidden relative group/item ${
                                                    isExpanded ? "border-emerald-500/20 shadow-xl ring-4 ring-emerald-500/5" : "border-stone-100 hover:border-stone-200 hover:shadow-lg"
                                                }`}
                                            >
                                                {/* Connection Dot */}
                                                <div className="absolute top-1/2 -left-[38px] md:-left-[54px] -translate-y-1/2 w-4 h-4 rounded-full bg-stone-200 border-4 border-white z-10 group-hover/item:bg-emerald-400 transition-colors" />

                                                {/* Header */}
                                                <div 
                                                    className="p-5 flex items-center gap-4 cursor-pointer select-none"
                                                    onClick={() => setExpandedId(isExpanded ? null : uniqueId)}
                                                >
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                                        item.type === 'SCHEDULED' ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600"
                                                    }`}>
                                                        {item.type === 'SCHEDULED' ? (
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                                                <path d="M16 2v4M8 2v4M3 10h18" />
                                                            </svg>
                                                        ) : (
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                <circle cx="12" cy="12" r="10" />
                                                                <path d="M12 6v6l4 2" />
                                                            </svg>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-stone-400 text-[10px] font-black uppercase tracking-wider">
                                                                {item.startTime ? formatTime12(item.startTime) : 'No time'}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                                item.type === 'SCHEDULED' ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600"
                                                            }`}>
                                                                {item.type === 'SCHEDULED' ? 'Scheduled' : 'Free Session'}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-lg font-black text-stone-800 truncate leading-tight">
                                                            {item.title}
                                                        </h3>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {/* Action Logs Mini Images */}
                                                        <div className="hidden md:flex -space-x-3 overflow-hidden">
                                                            {item.actionLogs.flatMap((al: any) => al.images).slice(0, 3).map((img: any, i: number) => (
                                                                <img 
                                                                    key={i} 
                                                                    src={img.url} 
                                                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover shadow-sm" 
                                                                    alt="note"
                                                                />
                                                            ))}
                                                            {item.actionLogs.flatMap((al: any) => al.images).length > 3 && (
                                                                <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white bg-stone-100 text-[10px] font-bold text-stone-500 shadow-sm">
                                                                    +{item.actionLogs.flatMap((al: any) => al.images).length - 3}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className={`p-2 rounded-xl transition-colors ${isExpanded ? "bg-emerald-50 text-emerald-600 rotate-180" : "bg-stone-50 text-stone-400 group-hover/item:text-stone-600"}`}>
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="m6 9 6 6 6-6" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div className="px-6 pb-6 pt-2 border-t border-stone-100 bg-stone-50/30">
                                                        {/* AI Summary */}
                                                        <div className="mb-6">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                                                            <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
                                                                            <polyline points="7.5 19.79 7.5 14.6 3 12" />
                                                                            <polyline points="21 12 16.5 14.6 16.5 19.79" />
                                                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                                                            <line x1="12" y1="22.08" x2="12" y2="12" />
                                                                        </svg>
                                                                    </div>
                                                                    <span className="font-black text-stone-800 tracking-tight">AI สรุปบทเรียน</span>
                                                                </div>
                                                                <button 
                                                                    onClick={() => handleGenerateAI(item.id, item.type)}
                                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                        <path d="M21 2v6h-6" />
                                                                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                                                                        <path d="M3 22v-6h6" />
                                                                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                                                                    </svg>
                                                                    {item.aiSummary ? "สรุปใหม่" : "ให้ AI สรุปให้"}
                                                                </button>
                                                            </div>
                                                            
                                                            {item.aiSummary ? (
                                                                <div className="bg-white border border-indigo-100 p-4 rounded-2xl text-stone-600 leading-relaxed font-medium shadow-sm relative overflow-hidden">
                                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 opacity-50" />
                                                                    <div className="relative z-10 whitespace-pre-wrap">
                                                                        {item.aiSummary}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-stone-100/50 border-2 border-dashed border-stone-200 p-6 rounded-2xl text-center">
                                                                    <p className="text-stone-400 font-bold text-sm">ยังไม่มีการสรุปบทเรียน กดปุ่มด้านบนเพื่อให้ AI ช่วยสรุปให้คุณ</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Action Logs */}
                                                        <div className="space-y-4">
                                                            <h4 className="font-black text-stone-800 tracking-tight text-sm flex items-center gap-2">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                    <line x1="8" y1="6" x2="21" y2="6" />
                                                                    <line x1="8" y1="12" x2="21" y2="12" />
                                                                    <line x1="8" y1="18" x2="21" y2="18" />
                                                                    <line x1="3" y1="6" x2="3.01" y2="6" />
                                                                    <line x1="3" y1="12" x2="3.01" y2="12" />
                                                                    <line x1="3" y1="18" x2="3.01" y2="18" />
                                                                </svg>
                                                                บันทึกกิจกรรม
                                                            </h4>
                                                            
                                                            <div className="grid gap-3">
                                                                {item.actionLogs.map((al: any) => (
                                                                    <div key={al.id} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-black text-stone-400">
                                                                                    {formatTime12(al.time)}
                                                                                </span>
                                                                                <span className="px-2 py-0.5 rounded-md bg-stone-100 text-[10px] font-black text-stone-600">
                                                                                    {al.action}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <button 
                                                                                    onClick={() => {
                                                                                        setEditingNoteId(al.id);
                                                                                        setEditValue(al.note || "");
                                                                                    }}
                                                                                    className="p-1.5 text-stone-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                                >
                                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {editingNoteId === al.id ? (
                                                                            <div className="space-y-2">
                                                                                <textarea
                                                                                    value={editValue}
                                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                                    className="w-full bg-stone-50 border border-emerald-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                                                    rows={3}
                                                                                />
                                                                                <div className="flex justify-end gap-2">
                                                                                    <button 
                                                                                        onClick={() => setEditingNoteId(null)}
                                                                                        className="px-3 py-1 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                                                                                    >
                                                                                        ยกเลิก
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={() => handleUpdateNote(al.id, item.type)}
                                                                                        className="px-3 py-1 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-lg shadow-emerald-500/20 transition-colors"
                                                                                    >
                                                                                        บันทึก
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-stone-600 text-sm font-medium leading-relaxed">
                                                                                {al.note || <span className="text-stone-300 italic">ไม่มีโน๊ต</span>}
                                                                            </p>
                                                                        )}

                                                                        {al.images && al.images.length > 0 && (
                                                                            <div className="flex flex-wrap gap-2 mt-3">
                                                                                {al.images.map((img: any) => (
                                                                                    <div key={img.id} className="relative group/img cursor-zoom-in">
                                                                                        <img 
                                                                                            src={img.url} 
                                                                                            className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl border border-stone-200 shadow-sm transition-transform group-hover/img:scale-105" 
                                                                                            alt="attachment"
                                                                                            onClick={() => window.open(img.url, '_blank')}
                                                                                        />
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Danger Zone */}
                                                        <div className="mt-8 pt-6 border-t border-stone-100 flex justify-end">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(item.id, item.type);
                                                                }}
                                                                className="text-xs font-bold text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                    <path d="M3 6h18" />
                                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                                </svg>
                                                                ลบบันทึกถาวร
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
