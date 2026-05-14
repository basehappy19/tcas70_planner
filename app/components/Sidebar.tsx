'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        { name: "หน้าหลัก", icon: "🏡", path: "/" },
        { name: "ตารางติว", icon: "📅", path: "/schedule" },
        { name: "ห้องติว", icon: "📝", path: "/study" },
        { name: "ลองสอบ", icon: "⏱️", path: "/mocktest" },
    ];

    return (
        <aside className="w-full md:w-72 bg-neutral-900 border-r border-neutral-800 md:h-screen sticky top-0 flex flex-col justify-between z-50">
            <div>
                <div className="p-6 md:p-8 border-b border-neutral-800 hidden md:block">
                    <h1 className="text-2xl font-black text-white leading-tight uppercase tracking-widest">
                        TCAS 70 <br/>
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

        </aside>
    );
}