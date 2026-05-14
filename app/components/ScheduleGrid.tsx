'use client'
import { useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { updateSchedule } from "../actions/schedule";

dayjs.extend(customParseFormat);

type ScheduleItem = {
    id: number;
    title: string;
    startTime: string;
    endTime: string;   
    dayOfWeek?: number;
};

export default function ScheduleGrid({ item, isToday }: { item: ScheduleItem, isToday?: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        title: item.title,
        startTime: item.startTime,
        endTime: item.endTime
    });

    const formatTo12Hour = (time24: string) => {
        if (!time24) return "";
        return dayjs(time24, "HH:mm").format("hh:mm A");
    };

    const handleUpdate = async () => {
        const res = await updateSchedule(item.id, formData);
        if (res.success) {
            setIsEditing(false);
        } else {
            alert(res.message);
        }
    };

    return (
        <>
            <div 
                onClick={() => setIsEditing(true)}
                className={`group relative bg-[#1e1e1e] p-4 rounded-2xl transition-all cursor-pointer shadow-lg 
                    ${isToday ? 'border-2 border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border border-gray-800 hover:border-emerald-500/50 hover:shadow-emerald-500/5'}
                `}
            >
                <div className="text-[10px] text-gray-500 font-mono mb-1">
                    {formatTo12Hour(item.startTime)} - {formatTo12Hour(item.endTime)}
                </div>
                <div className="text-sm font-bold text-gray-200 line-clamp-2 leading-snug">{item.title}</div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    ✏️
                </div>
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-sans">
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
                                        className="w-full bg-black text-white border border-gray-800 rounded-xl p-3 mt-1 focus:border-emerald-500 outline-none [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">เวลาจบ</label>
                                    <input 
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                                        className="w-full bg-black text-white border border-gray-800 rounded-xl p-3 mt-1 focus:border-emerald-500 outline-none [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setIsEditing(false)} className="flex-1 py-3 text-gray-500 hover:text-white transition-colors font-bold">ยกเลิก</button>
                            <button onClick={handleUpdate} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold text-white transition-colors shadow-lg shadow-emerald-500/20">บันทึกข้อมูล</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}