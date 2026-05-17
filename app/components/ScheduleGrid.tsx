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
                    className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 transition-all duration-300 ${historyVisible
                        ? "bg-black/30 opacity-100"
                        : "bg-black/0 opacity-0"
                        }`}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-[#161616]/95 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-all duration-300 ${historyVisible
                            ? "scale-100 translate-y-0 opacity-100"
                            : "scale-95 translate-y-4 opacity-0"
                            }`}
                    >
                        <div className="flex items-start justify-between p-5 border-b border-neutral-800/60 shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-white">
                                    ประวัติการเรียน
                                </h2>

                                <div className="mt-0.5">
                                    <p className="text-xs text-emerald-400 line-clamp-1">
                                        {item.title}
                                    </p>

                                    <p className="text-[11px] text-neutral-500 mt-1">
                                        {scheduleInfo}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={closeHistoryModal}
                                className="cursor-pointer text-neutral-600 hover:text-white p-1 transition-colors shrink-0 ml-3"
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
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-5 h-5 rounded-full border-2 border-neutral-700 border-t-emerald-500 animate-spin" />
                                </div>
                            ) : historyData.length > 0 ? (
                                historyData.map((log) => (
                                    <div
                                        key={log.id}
                                        className="bg-neutral-900/60 border border-neutral-800/60 rounded-xl p-4"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="text-sm font-semibold text-neutral-200">
                                                    {dayjs(log.date).format(
                                                        "D MMMM BBBB"
                                                    )}
                                                </p>

                                                <p className="text-[10px] text-neutral-600 mt-0.5 font-mono">
                                                    เริ่ม{" "}
                                                    {log.actualStartAt
                                                        ? dayjs(
                                                            log.actualStartAt
                                                        ).format("h:mm A")
                                                        : "—"}

                                                    {log.delayMinutes > 0 && (
                                                        <span className="text-red-400 ml-1.5">
                                                            +
                                                            {
                                                                log.delayMinutes
                                                            }{" "}
                                                            นาที
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {log.actionLogs?.length > 0 ? (
                                            <ul className="space-y-2 border-t border-neutral-800/50 pt-3">
                                                {log.actionLogs.map((al) => (
                                                    <li
                                                        key={al.id}
                                                        className="flex gap-3 text-xs"
                                                    >
                                                        <span className="text-neutral-700 font-mono w-10 shrink-0 pt-px">
                                                            {dayjs(
                                                                al.time
                                                            ).format("h:mm A")}
                                                        </span>

                                                        <span className="flex-1 text-neutral-400">
                                                            <span className="text-neutral-300 font-medium">
                                                                {ACTION_LABELS[
                                                                    al.action
                                                                ] ?? al.action}
                                                            </span>

                                                            {al.note && (
                                                                <span className="block mt-1 text-neutral-500 pl-2 border-l-2 border-neutral-800/80">
                                                                    {al.note}
                                                                </span>
                                                            )}

                                                            {al.images &&
                                                                al.images
                                                                    .length >
                                                                0 && (
                                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                                        {al.images.map(
                                                                            (
                                                                                img
                                                                            ) => {
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
                                                                                        className="cursor-pointer relative block w-16 h-16 rounded-md overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-colors"
                                                                                    >
                                                                                        <Image
                                                                                            width={
                                                                                                64
                                                                                            }
                                                                                            height={
                                                                                                64
                                                                                            }
                                                                                            src={
                                                                                                imageUrl
                                                                                            }
                                                                                            alt={
                                                                                                img.caption ||
                                                                                                "Note image"
                                                                                            }
                                                                                            className="w-full h-full object-cover"
                                                                                        />

                                                                                        {img.caption && (
                                                                                            <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white px-1 py-0.5 truncate">
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
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-[11px] text-neutral-700 border-t border-neutral-800/50 pt-3 italic">
                                                ไม่มีบันทึกกิจกรรม
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-sm text-neutral-600">
                                        ยังไม่มีประวัติ
                                    </p>

                                    <p className="text-xs text-neutral-700 mt-1">
                                        เริ่มเรียนแล้วประวัติจะปรากฏที่นี่
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {isEditing && (
                <div
                    onClick={closeEditModal}
                    className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 transition-all duration-300 ${editVisible
                            ? "bg-black/30 opacity-100"
                            : "bg-black/0 opacity-0"
                        }`}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-[#161616]/95 border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${editVisible
                                ? "scale-100 translate-y-0 opacity-100"
                                : "scale-95 translate-y-4 opacity-0"
                            }`}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-neutral-800/60">
                            <div>
                                <h2 className="text-base font-bold text-white">
                                    แก้ไขคาบเรียน
                                </h2>

                                <p className="text-[11px] text-neutral-500 mt-1">
                                    {scheduleInfo}
                                </p>
                            </div>

                            <button
                                onClick={closeEditModal}
                                className="cursor-pointer text-neutral-600 hover:text-white p-1 transition-colors"
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
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block mb-1.5">
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
                                    className={`w-full bg-neutral-950 text-white text-sm border rounded-2xl px-3.5 py-3 outline-none transition-colors ${errors.title
                                            ? "border-rose-500 focus:border-rose-400"
                                            : "border-neutral-800 focus:border-emerald-500/60"
                                        }`}
                                />

                                {errors.title && (
                                    <p className="text-rose-400 text-xs mt-1">
                                        กรุณากรอกชื่อวิชา
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block mb-1.5">
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
                                        className={`cursor-pointer w-full bg-neutral-950 text-white text-sm border rounded-2xl px-3 py-3 outline-none transition-colors ${errors.startTime
                                                ? "border-rose-500 focus:border-rose-400"
                                                : "border-neutral-800 focus:border-emerald-500/60"
                                            }`}
                                    />

                                    {errors.startTime && (
                                        <p className="text-rose-400 text-xs mt-1">
                                            กรุณาเลือกเวลาเริ่ม
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block mb-1.5">
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
                                        className={`cursor-pointer w-full bg-neutral-950 text-white text-sm border rounded-2xl px-3 py-3 outline-none transition-colors ${errors.endTime
                                                ? "border-rose-500 focus:border-rose-400"
                                                : "border-neutral-800 focus:border-emerald-500/60"
                                            }`}
                                    />

                                    {errors.endTime && (
                                        <p className="text-rose-400 text-xs mt-1">
                                            กรุณาเลือกเวลาจบ
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 p-5 pt-0">
                            <button
                                onClick={closeEditModal}
                                className="cursor-pointer flex-1 py-3 rounded-2xl text-sm text-neutral-400 hover:text-white hover:bg-white/5 border border-neutral-800 transition-colors"
                            >
                                ยกเลิก
                            </button>

                            <button
                                onClick={handleUpdate}
                                disabled={!isFormValid}
                                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-colors ${isFormValid
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