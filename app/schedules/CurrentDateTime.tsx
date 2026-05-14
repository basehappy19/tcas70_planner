"use client";

import { useEffect, useState } from "react";

type Day = {
    name: string;
    dayIndex: number;
};

export default function CurrentDateTime({ days }: { days: Day[] }) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const bkkTime = new Date(
        now.toLocaleString("en-US", {
            timeZone: "Asia/Bangkok",
        })
    );

    const currentDayIndex = bkkTime.getDay();

    const currentTime = bkkTime.toLocaleTimeString("th-TH", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });

    return (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />

            วันนี้ ·{" "}
            {days.find((d) => d.dayIndex === currentDayIndex)?.name ?? "—"} ·{" "}
            {currentTime}
        </div>
    );
}