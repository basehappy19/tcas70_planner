'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
    { name: "หน้าหลัก",  path: "/" },
    { name: "ตารางติว",  path: "/schedules" },
    { name: "ห้องติว",   path: "/resources" },
    { name: "ลองสอบ",   path: "/mocktest" },
];

const IconHome = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
    </svg>
);
const IconCalendar = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
);
const IconBook = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
);
const IconClock = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 3"/>
    </svg>
);

const ICONS = [IconHome, IconCalendar, IconBook, IconClock];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <>
            {/* ════ Desktop left rail ════ */}
            <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[#0c0c0c] border-r border-white/6 min-h-screen sticky top-0">
                {/* Brand */}
                <div className="px-5 py-6 border-b border-white/6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(16,185,129,0.4)]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                        <div>
                            <p className="text-white font-black text-sm tracking-tight">TCAS 70</p>
                            <p className="text-neutral-600 text-[10px] tracking-[0.15em] uppercase">Planner</p>
                        </div>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 p-3 space-y-0.5 pt-4">
                    {menuItems.map((item, i) => {
                        const Icon = ICONS[i];
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
                                    isActive
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "text-neutral-500 hover:text-neutral-200 hover:bg-white/4"
                                }`}
                            >
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-full" />
                                )}
                                <Icon />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-5 border-t border-white/6">
                    <p className="text-[11px] text-neutral-700 leading-relaxed font-medium">มุ่งมั่น · ตั้งใจ · สำเร็จ</p>
                </div>
            </aside>

            {/* ════ Mobile top bar ════ */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0c0c0c] border-b border-white/6 sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <span className="text-white font-black text-sm tracking-tight">TCAS 70</span>
                </div>
                <span className="text-[11px] text-neutral-600 uppercase tracking-widest">Planner</span>
            </div>

            {/* ════ Mobile bottom tab bar ════ */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c0c]/95 backdrop-blur-xl border-t border-white/6">
                <div className="grid grid-cols-4">
                    {menuItems.map((item, i) => {
                        const Icon = ICONS[i];
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className="flex flex-col items-center gap-1.5 pt-3 pb-4 px-1 transition-all"
                            >
                                <span className={`transition-all duration-150 ${isActive ? "text-emerald-400" : "text-neutral-600"}`}>
                                    <Icon />
                                </span>
                                <span className={`text-[10px] font-semibold transition-colors leading-none ${isActive ? "text-emerald-400" : "text-neutral-600"}`}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}