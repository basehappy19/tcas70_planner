'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        { name: "Dashboard", icon: "🚀", path: "/" },
        { name: "Schedule Builder", icon: "📅", path: "/schedule" },
        { name: "Study Room", icon: "📝", path: "/study" },
        { name: "Mock Test Arena", icon: "⏱️", path: "/mocktest" },
        { name: "History & Logs", icon: "🗄️", path: "/history" },
    ];

    return (
        <aside className="w-full md:w-72 bg-neutral-900 border-r border-neutral-800 md:h-screen sticky top-0 flex flex-col justify-between z-50">
            <div>
                {/* Header ของ Sidebar */}
                <div className="p-6 md:p-8 border-b border-neutral-800 hidden md:block">
                    <h1 className="text-2xl font-black text-white leading-tight uppercase tracking-widest">
                        TCAS 70 <br/> <span className="text-emerald-500">Command</span>
                    </h1>
                </div>

                {/* เมนูต่างๆ */}
                <nav className="p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible no-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link 
                                key={item.path} 
                                href={item.path}
                                className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold whitespace-nowrap transition-all ${
                                    isActive 
                                    ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* โปรไฟล์ด้านล่างสุด (แสดงเฉพาะบนคอม) */}
            <div className="p-6 border-t border-neutral-800 hidden md:flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black text-lg border border-emerald-500/50">
                    B
                </div>
                <div>
                    <div className="text-sm font-bold text-white">Bass</div>
                    <div className="text-xs text-neutral-500 font-mono">TGAT/TPAT3</div>
                </div>
            </div>
        </aside>
    );
}