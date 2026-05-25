'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
    { name: "หน้าหลัก",       path: "/" },
    { name: "ตารางติว",       path: "/schedules" },
    { name: "เรียนนอกตาราง", path: "/free-study" },
    { name: "ห้องติว",        path: "/resources" },
    { name: "ลองสอบ",         path: "/mocktest" },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconHome = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
    </svg>
);

const IconCalendar = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
);

// ไอคอน "เรียนนอกตาราง" — นาฬิกาจับเวลา
const IconFreeStudy = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5" />
        <path d="M9 3h6" />
        <path d="M19.5 6.5l1-1" />
    </svg>
);

const IconBook = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);

const IconClock = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
    </svg>
);

const ICONS = [IconHome, IconCalendar, IconFreeStudy, IconBook, IconClock];

// active accent per route — index matches menuItems order
const ACTIVE_STYLES = [
    // หน้าหลัก — emerald
    { icon: "bg-emerald-100 text-emerald-600", link: "text-emerald-600 shadow-[0_6px_20px_rgba(16,185,129,0.12)] border-emerald-100", glow: "from-emerald-50", mobile: "bg-emerald-100 text-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.18)]", mobileText: "text-emerald-600" },
    // ตารางติว — emerald
    { icon: "bg-emerald-100 text-emerald-600", link: "text-emerald-600 shadow-[0_6px_20px_rgba(16,185,129,0.12)] border-emerald-100", glow: "from-emerald-50", mobile: "bg-emerald-100 text-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.18)]", mobileText: "text-emerald-600" },
    // เรียนนอกตาราง — violet
    { icon: "bg-violet-100 text-violet-600", link: "text-violet-600 shadow-[0_6px_20px_rgba(139,92,246,0.12)] border-violet-100", glow: "from-violet-50", mobile: "bg-violet-100 text-violet-600 shadow-[0_4px_14px_rgba(139,92,246,0.18)]", mobileText: "text-violet-600" },
    // ห้องติว — blue
    { icon: "bg-blue-100 text-blue-600", link: "text-blue-600 shadow-[0_6px_20px_rgba(59,130,246,0.12)] border-blue-100", glow: "from-blue-50", mobile: "bg-blue-100 text-blue-600 shadow-[0_4px_14px_rgba(59,130,246,0.18)]", mobileText: "text-blue-600" },
    // ลองสอบ — orange
    { icon: "bg-orange-100 text-orange-600", link: "text-orange-600 shadow-[0_6px_20px_rgba(249,115,22,0.12)] border-orange-100", glow: "from-orange-50", mobile: "bg-orange-100 text-orange-600 shadow-[0_4px_14px_rgba(249,115,22,0.18)]", mobileText: "text-orange-600" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <>
            {/* ════════════════════════════════════════════
                Desktop Sidebar
            ════════════════════════════════════════════ */}
            <aside className="hidden md:flex flex-col w-64 shrink-0 min-h-screen sticky top-0 bg-[#FCFCF8] border-r border-stone-200/70">

                {/* Brand */}
                <div className="px-6 pt-7 pb-6">
                    <div className="rounded-3xl border border-emerald-100 bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-300 flex items-center justify-center shadow-[0_10px_25px_rgba(16,185,129,0.35)]">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-stone-800 font-black text-lg tracking-tight">TCAS 70</p>
                                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 font-bold">Planner</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1.5">
                    {menuItems.map((item, i) => {
                        const Icon = ICONS[i];
                        const isActive = pathname === item.path;
                        const ac = ACTIVE_STYLES[i];

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 ${
                                    isActive
                                        ? `bg-white ${ac.link} border`
                                        : "text-stone-500 hover:bg-white/80 hover:text-stone-800"
                                }`}
                            >
                                {isActive && (
                                    <div className={`absolute inset-0 rounded-2xl bg-linear-to-r ${ac.glow} to-transparent pointer-events-none`} />
                                )}
                                <div className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                                    isActive
                                        ? ac.icon
                                        : "bg-stone-100 text-stone-500 group-hover:bg-stone-200"
                                }`}>
                                    <Icon />
                                </div>
                                <span className="relative z-10 text-sm font-bold tracking-tight">
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

            </aside>

            {/* ════════════════════════════════════════════
                Mobile Topbar
            ════════════════════════════════════════════ */}
            <div className="md:hidden sticky top-0 z-40 border-b border-stone-200/70 bg-[#FCFCF8]/90 backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-300 flex items-center justify-center shadow-[0_6px_20px_rgba(16,185,129,0.3)]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-black text-stone-800 tracking-tight">TCAS 70</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-bold">Planner</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════
                Mobile Bottom Nav — 5 items
            ════════════════════════════════════════════ */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white/90 backdrop-blur-xl">
                <div className="grid grid-cols-5 px-1 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {menuItems.map((item, i) => {
                        const Icon = ICONS[i];
                        const isActive = pathname === item.path;
                        const ac = ACTIVE_STYLES[i];

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className="flex flex-col items-center justify-center py-1.5 relative"
                            >
                                <div className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${
                                    isActive ? ac.mobile : "text-stone-400"
                                }`}>
                                    <Icon />
                                </div>
                                <span className={`mt-0.5 text-[9px] font-bold transition-colors leading-tight text-center ${
                                    isActive ? ac.mobileText : "text-stone-400"
                                }`}>
                                    {/* ย่อชื่อให้พอดี mobile */}
                                    {item.name === "เรียนนอกตาราง" ? "นอกตาราง" : item.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}