/* cSpell:disable */

'use client'

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import buddhistEra from "dayjs/plugin/buddhistEra";
import "dayjs/locale/th";
import { updateSchedule, getScheduleHistory } from "../actions/schedule";
import Image from "next/image";

dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.extend(buddhistEra);
dayjs.locale("th");

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
        images?: {
            id: number;
            url: string;
            caption?: string | null;
        }[];
    }[];
};

const TYPE_COLORS: Record<string, { dot: string; label: string }> = {
    CONTENT: { dot: "bg-blue-400", label: "text-blue-400" },
    FREE_TIME: { dot: "bg-emerald-400", label: "text-emerald-400" },
    MOCK_TEST: { dot: "bg-violet-400", label: "text-violet-400" },
};

const ACTION_LABELS: Record<string, string> = {
    START_ON_TIME: "เริ่มตรงเวลา",
    START_LATE: "เริ่มช้า",
    PAUSE: "พักเบรก",
    RESUME: "เรียนต่อ",
    TAKE_NOTE: "จดโน้ต",
    END_SESSION: "จบการเรียน",
};

export default function ScheduleGrid({
    item,
    isToday,
}: {
    item: ScheduleItem;
    isToday?: boolean;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editVisible, setEditVisible] = useState(false);

    const [showHistory, setShowHistory] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);

    const [selectedImage, setSelectedImage] = useState<{
        url: string;
        caption?: string | null;
    } | null>(null);

    const [imageVisible, setImageVisible] = useState(false);

    const [isCurrentTimeSlot, setIsCurrentTimeSlot] = useState(false);

    const [historyData, setHistoryData] = useState<StudyLogWithActions[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [formData, setFormData] = useState({
        title: item.title,
        startTime: item.startTime,
        endTime: item.endTime,
    });

    const [errors, setErrors] = useState({
        title: false,
        startTime: false,
        endTime: false,
    });

    const fmt = (t: string) =>
        t ? dayjs(t, "HH:mm").format("h:mm A") : "";

    const validateForm = () => {
        const newErrors = {
            title: !formData.title.trim(),
            startTime: !formData.startTime,
            endTime: !formData.endTime,
        };

        setErrors(newErrors);

        return !Object.values(newErrors).some(Boolean);
    };

    const isFormValid =
        formData.title.trim() &&
        formData.startTime &&
        formData.endTime;

    useEffect(() => {
        if (!isToday) return;

        const check = () => {
            const now = dayjs();
            const s = dayjs(item.startTime, "HH:mm");
            const e = dayjs(item.endTime, "HH:mm");

            setIsCurrentTimeSlot(
                now.isAfter(
                    now.hour(s.hour()).minute(s.minute()).second(0)
                ) &&
                now.isBefore(
                    now.hour(e.hour()).minute(e.minute()).second(0)
                )
            );
        };

        check();

        const id = setInterval(check, 30000);

        return () => clearInterval(id);
    }, [isToday, item.startTime, item.endTime]);

    const handleUpdate = async () => {
        if (!validateForm()) return;

        const res = await updateSchedule(item.id, formData);

        if (res.success) {
            setErrors({
                title: false,
                startTime: false,
                endTime: false,
            });

            closeEditModal();
        } else {
            alert(res.message);
        }
    };

    const openEditModal = () => {
        setIsEditing(true);

        requestAnimationFrame(() => {
            setEditVisible(true);
        });
    };

    const closeEditModal = () => {
        setEditVisible(false);

        setTimeout(() => {
            setIsEditing(false);
        }, 250);
    };

    const openHistoryModal = async () => {
        setShowHistory(true);

        requestAnimationFrame(() => {
            setHistoryVisible(true);
        });

        setLoadingHistory(true);

        const res = await getScheduleHistory(item.id);

        if (res.success && res.data) {
            setHistoryData(res.data);
        }

        setLoadingHistory(false);
    };

    const closeHistoryModal = () => {
        setHistoryVisible(false);

        setTimeout(() => {
            setShowHistory(false);
        }, 250);
    };

    const openImageModal = (
        url: string,
        caption?: string | null
    ) => {
        setSelectedImage({
            url,
            caption,
        });

        requestAnimationFrame(() => {
            setImageVisible(true);
        });
    };

    const closeImageModal = () => {
        setImageVisible(false);

        setTimeout(() => {
            setSelectedImage(null);
        }, 250);
    };

    const getGoogleDriveImageUrl = (url: string) => {
        const match = url.match(/\/d\/(.*?)\//);

        if (!match) return url;

        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    };

    const typeColor =
        TYPE_COLORS[item.type?.toUpperCase() ?? ""] ?? {
            dot: "bg-neutral-500",
            label: "text-neutral-400",
        };

    const DAY_NAMES = [
        "อาทิตย์",
        "จันทร์",
        "อังคาร",
        "พุธ",
        "พฤหัสบดี",
        "ศุกร์",
        "เสาร์",
    ];

    const scheduleInfo = `วัน${DAY_NAMES[item.dayOfWeek]} • ${fmt(
        item.startTime
    )} - ${fmt(item.endTime)}`;

    return (
        <>
            <div
                className={`relative rounded-xl p-3 border transition-all duration-200 ${isCurrentTimeSlot
                    ? "bg-emerald-500/8 border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.12)]"
                    : isToday
                        ? "bg-neutral-900 border-neutral-700/60 hover:border-neutral-600"
                        : "bg-neutral-900/50 border-neutral-800/50 hover:border-neutral-700/50"
                    }`}
            >
                {isCurrentTimeSlot && (
                    <span className="absolute -top-2.5 right-3 bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider">
                        ตอนนี้
                    </span>
                )}

                <p className="text-[10px] text-neutral-600 font-mono mb-1.5 tabular-nums">
                    {fmt(item.startTime)} – {fmt(item.endTime)}
                </p>

                <div className="flex items-start gap-1.5 mb-3">
                    <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${typeColor.dot}`}
                    />

                    <p className="text-sm font-semibold text-neutral-100 leading-snug line-clamp-2">
                        {item.title}
                    </p>
                </div>

                <div className="flex gap-1.5">
                    <button
                        onClick={openHistoryModal}
                        className="cursor-pointer flex-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-200 bg-white/3 hover:bg-white/[0.07] border border-white/6 py-1.5 rounded-lg transition-colors"
                    >
                        ประวัติ
                    </button>

                    <button
                        onClick={openEditModal}
                        className="cursor-pointer px-2.5 text-[11px] text-neutral-500 hover:text-neutral-200 bg-white/3 hover:bg-white/[0.07] border border-white/6 py-1.5 rounded-lg transition-colors"
                    >
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                </div>
            </div>

            {showHistory && (
                <div
                    onClick={closeHistoryModal}
                    className={`fixed inset-0 z-50 backdrop-blur-xl flex items-center justify-center p-4 transition-all duration-300 ${historyVisible
                            ? "bg-black/50 opacity-100"
                            : "bg-black/0 opacity-0"
                        }`}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-[#111111]/95 border border-white/10 w-full max-w-2xl rounded-[28px] shadow-[0_25px_80px_rgba(0,0,0,0.55)] flex flex-col max-h-[88vh] overflow-hidden transition-all duration-300 ${historyVisible
                                ? "scale-100 translate-y-0 opacity-100"
                                : "scale-95 translate-y-6 opacity-0"
                            }`}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/6 bg-neutral-900/40 shrink-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">

                                    <h2 className="text-xl font-bold text-white mt-1">
                                        ประวัติการเรียน
                                    </h2>

                                    <div className="mt-2 space-y-1">
                                        <p className="text-sm text-neutral-300 line-clamp-1">
                                            {item.title}
                                        </p>

                                        <p className="text-xs text-neutral-500">
                                            {scheduleInfo}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={closeHistoryModal}
                                    className="cursor-pointer shrink-0 rounded-xl border border-white/5 bg-white/3 p-2 text-neutral-500 hover:text-white hover:bg-white/6 transition-all"
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-6 h-6 rounded-full border-2 border-neutral-700 border-t-emerald-500 animate-spin" />
                                </div>
                            ) : historyData.length > 0 ? (
                                historyData.map((log) => (
                                    <div
                                        key={log.id}
                                        className="rounded-2xl border border-white/5 bg-neutral-900/50 overflow-hidden"
                                    >
                                        {/* Card Header */}
                                        <div className="px-5 py-4 border-b border-white/5 bg-white/2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {dayjs(log.date).format(
                                                            "D MMMM BBBB"
                                                        )}
                                                    </p>

                                                    <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                                                        เริ่ม{" "}
                                                        {log.actualStartAt
                                                            ? dayjs(
                                                                log.actualStartAt
                                                            ).format("h:mm A")
                                                            : "—"}

                                                        {log.delayMinutes > 0 && (
                                                            <span className="text-rose-400 ml-2">
                                                                +{log.delayMinutes} นาที
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-5">
                                            {log.actionLogs?.length > 0 ? (
                                                <ul className="space-y-4">
                                                    {log.actionLogs.map((al) => (
                                                        <li
                                                            key={al.id}
                                                            className="flex gap-4"
                                                        >
                                                            <div className="w-14 shrink-0">
                                                                <span className="text-[11px] font-mono text-neutral-600">
                                                                    {dayjs(al.time).format(
                                                                        "h:mm A"
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-neutral-200 font-medium">
                                                                    {ACTION_LABELS[
                                                                        al.action
                                                                    ] ?? al.action}
                                                                </p>

                                                                {al.note && (
                                                                    <div className="mt-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
                                                                        <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap wrap-break-word">
                                                                            {al.note}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {al.images &&
                                                                    al.images.length >
                                                                    0 && (
                                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                                            {al.images.map(
                                                                                (img) => {
                                                                                    const imageUrl =
                                                                                        getGoogleDriveImageUrl(
                                                                                            img.url
                                                                                        );

                                                                                    return (
                                                                                        <button
                                                                                            key={
                                                                                                img.id
                                                                                            }
                                                                                            onClick={() =>
                                                                                                openImageModal(
                                                                                                    imageUrl,
                                                                                                    img.caption
                                                                                                )
                                                                                            }
                                                                                            className="cursor-pointer group relative block w-20 h-20 overflow-hidden border border-white/5 hover:border-white/15 transition-all"
                                                                                        >
                                                                                            <Image
                                                                                                width={
                                                                                                    80
                                                                                                }
                                                                                                height={
                                                                                                    80
                                                                                                }
                                                                                                src={
                                                                                                    imageUrl
                                                                                                }
                                                                                                alt={
                                                                                                    img.caption ||
                                                                                                    "Note image"
                                                                                                }
                                                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                                            />

                                                                                            {img.caption && (
                                                                                                <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm text-[10px] text-white px-2 py-1 truncate">
                                                                                                    {
                                                                                                        img.caption
                                                                                                    }
                                                                                                </div>
                                                                                            )}
                                                                                        </button>
                                                                                    );
                                                                                }
                                                                            )}
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-white/5 bg-black/10 py-8 text-center">
                                                    <p className="text-sm text-neutral-600 italic">
                                                        ไม่มีบันทึกกิจกรรม
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center">
                                    <div className="text-4xl mb-4">📚</div>

                                    <p className="text-base text-neutral-400 font-medium">
                                        ยังไม่มีประวัติ
                                    </p>

                                    <p className="text-sm text-neutral-600 mt-2">
                                        เริ่มเรียนแล้วประวัติจะปรากฏที่นี่
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-white/5 bg-neutral-900/40 px-5 py-4 shrink-0">
                            <button
                                onClick={closeHistoryModal}
                                className="cursor-pointer w-full rounded-2xl border border-white/10 bg-white/3 py-3 text-sm font-semibold text-neutral-300 hover:bg-white/6 hover:text-white transition-all"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isEditing && (
                <div
                    onClick={closeEditModal}
                    className={`fixed inset-0 z-50 backdrop-blur-xl flex items-center justify-center p-4 transition-all duration-300 ${editVisible
                        ? "bg-black/50 opacity-100"
                        : "bg-black/0 opacity-0"
                        }`}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-[#111111]/95 border border-white/10 w-full max-w-lg rounded-[28px] shadow-[0_25px_80px_rgba(0,0,0,0.55)] overflow-hidden transition-all duration-300 ${editVisible
                            ? "scale-100 translate-y-0 opacity-100"
                            : "scale-95 translate-y-6 opacity-0"
                            }`}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/6 bg-neutral-900/40">
                            <div className="flex items-start justify-between gap-4">
                                <div>

                                    <h2 className="text-xl font-bold text-white mt-1">
                                        แก้ไขคาบเรียน
                                    </h2>

                                    <p className="text-xs text-neutral-500 mt-2">
                                        {scheduleInfo}
                                    </p>
                                </div>

                                <button
                                    onClick={closeEditModal}
                                    className="cursor-pointer rounded-xl border border-white/5 bg-white/3 p-2 text-neutral-500 hover:text-white hover:bg-white/6 transition-all"
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-6 space-y-5">
                            <div>
                                <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block mb-2">
                                    ชื่อวิชา
                                </label>

                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => {
                                        setFormData({
                                            ...formData,
                                            title: e.target.value,
                                        });

                                        if (e.target.value.trim()) {
                                            setErrors({
                                                ...errors,
                                                title: false,
                                            });
                                        }
                                    }}
                                    className={`w-full bg-black/40 text-white text-sm border rounded-2xl px-4 py-3.5 outline-none transition-all ${errors.title
                                        ? "border-rose-500 focus:border-rose-400"
                                        : "border-white/5 focus:border-emerald-500/50"
                                        }`}
                                />

                                {errors.title && (
                                    <p className="text-rose-400 text-xs mt-2">
                                        กรุณากรอกชื่อวิชา
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block mb-2">
                                        เริ่ม
                                    </label>

                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => {
                                            setFormData({
                                                ...formData,
                                                startTime: e.target.value,
                                            });

                                            if (e.target.value) {
                                                setErrors({
                                                    ...errors,
                                                    startTime: false,
                                                });
                                            }
                                        }}
                                        className={`cursor-pointer w-full bg-black/40 text-white text-sm border rounded-2xl px-4 py-3.5 outline-none transition-all ${errors.startTime
                                            ? "border-rose-500 focus:border-rose-400"
                                            : "border-white/5 focus:border-emerald-500/50"
                                            }`}
                                    />

                                    {errors.startTime && (
                                        <p className="text-rose-400 text-xs mt-2">
                                            กรุณาเลือกเวลาเริ่ม
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block mb-2">
                                        จบ
                                    </label>

                                    <input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => {
                                            setFormData({
                                                ...formData,
                                                endTime: e.target.value,
                                            });

                                            if (e.target.value) {
                                                setErrors({
                                                    ...errors,
                                                    endTime: false,
                                                });
                                            }
                                        }}
                                        className={`cursor-pointer w-full bg-black/40 text-white text-sm border rounded-2xl px-4 py-3.5 outline-none transition-all ${errors.endTime
                                            ? "border-rose-500 focus:border-rose-400"
                                            : "border-white/5 focus:border-emerald-500/50"
                                            }`}
                                    />

                                    {errors.endTime && (
                                        <p className="text-rose-400 text-xs mt-2">
                                            กรุณาเลือกเวลาจบ
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-white/5 bg-neutral-900/40 px-6 py-5 flex gap-3">
                            <button
                                onClick={closeEditModal}
                                className="cursor-pointer flex-1 py-3 rounded-2xl text-sm text-neutral-400 hover:text-white hover:bg-white/5 border border-white/5 transition-all"
                            >
                                ยกเลิก
                            </button>

                            <button
                                onClick={handleUpdate}
                                disabled={!isFormValid}
                                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${isFormValid
                                    ? "cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
                                    : "cursor-not-allowed bg-neutral-800 text-neutral-500"
                                    }`}
                            >
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {selectedImage && (
                <div
                    onClick={closeImageModal}
                    className={`fixed inset-0 z-60 backdrop-blur-xl flex items-center justify-center p-4 transition-all duration-300 ${imageVisible
                        ? "bg-black/25 opacity-100"
                        : "bg-black/0 opacity-0"
                        }`}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`relative w-full max-w-5xl flex flex-col items-center transition-all duration-300 ${imageVisible
                            ? "scale-100 opacity-100 translate-y-0"
                            : "scale-95 opacity-0 translate-y-4"
                            }`}
                    >
                        <button
                            onClick={closeImageModal}
                            className="cursor-pointer absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                        >
                            <svg
                                width="28"
                                height="28"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="relative w-full flex justify-center">
                            <Image
                                src={selectedImage.url}
                                alt={
                                    selectedImage.caption || "Preview image"
                                }
                                width={1400}
                                height={1400}
                                className="max-h-[72vh] w-auto max-w-full object-contain rounded-2xl border border-white/10"
                            />
                        </div>

                        <div className="w-full max-w-3xl mt-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-neutral-100 wrap-break-word leading-relaxed">
                                    {selectedImage.caption ||
                                        "ไม่มีคำอธิบาย"}
                                </p>
                            </div>

                            <a
                                href={selectedImage.url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center justify-center gap-2 bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <path d="M7 10l5 5 5-5" />
                                    <path d="M12 15V3" />
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