export const dynamic = "force-dynamic";
export const revalidate = 0;
import { unstable_noStore as noStore } from "next/cache";

import prisma from "@/lib/prisma";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import HeroSection from "./components/HeroSection";
import { getCurrentSessionState } from "@/app/actions/study";

dayjs.extend(customParseFormat);

const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
};

const EARLY_START_MINUTES = 5;

function getThaiNow() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

async function getActiveStudyLog() {
    const now = getThaiNow();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return prisma.studyLog.findFirst({
        where: { status: "STUDYING", date: { gte: startOfDay } },
        include: { schedule: true },
        orderBy: { id: "desc" },
    });
}

export default async function Page() {
    noStore();
    const bkkTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const now = dayjs(bkkTime);

    const initialServerTime = now.format("h:mm:ss A");
    const initialDow = now.day();
    const initialMinutes = timeToMinutes(now.format("HH:mm"));

    const [allSchedules, initialStatus, activeLog] = await Promise.all([
        prisma.schedule.findMany({
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        }),
        getCurrentSessionState(),
        getActiveStudyLog(),
    ]);

    // ── คิดทั้งหมดบน server ──
    let initialCurrentSchedule = null;

    if ((initialStatus === "STUDYING" || initialStatus === "PAUSED") && activeLog?.schedule) {
        // มี session active → ยึด schedule ของ session นั้น
        initialCurrentSchedule = allSchedules.find(s => s.id === activeLog.schedule.id) ?? null;
    } else {
        // IDLE → หาจากเวลาปัจจุบัน + early window
        initialCurrentSchedule = allSchedules.find(s =>
            s.dayOfWeek === initialDow &&
            timeToMinutes(s.startTime) - EARLY_START_MINUTES <= initialMinutes &&
            timeToMinutes(s.endTime) >= initialMinutes
        ) ?? null;
    }

    const initialCanEnd = initialCurrentSchedule
        ? initialMinutes >= timeToMinutes(initialCurrentSchedule.endTime)
        : false;

    return (
        <main>
            <HeroSection
                allSchedules={allSchedules}
                initialTime={initialServerTime}
                initialDow={initialDow}
                initialMinutes={initialMinutes}
                initialCurrentScheduleId={initialCurrentSchedule?.id ?? null}
                initialCanEnd={initialCanEnd}
                initialStatus={initialStatus}
            />
        </main>
    );
}