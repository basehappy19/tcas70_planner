export const dynamic = "force-dynamic";
export const revalidate = 0;
import { unstable_noStore as noStore } from "next/cache";

import prisma from "@/lib/prisma";
import dayjs from "@/lib/dayjs";
import HeroSection from "@/components/layout/HeroSection";
import { getCurrentSessionState } from "@/features/study/services/study";

const EARLY_START_MINUTES = 5;

const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
};

async function getActiveStudyLog() {
    const now = dayjs();
    const startOfDay = now.startOf('day').toDate();
    return prisma.studyLog.findFirst({
        where: { status: "STUDYING", date: { gte: startOfDay } },
        include: { schedule: true },
        orderBy: { id: "desc" },
    });
}

export default async function Page() {
    noStore();
    const now = dayjs();

    const [allSchedules, initialStatus, activeLog] = await Promise.all([
        prisma.schedule.findMany({
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        }),
        getCurrentSessionState(),
        getActiveStudyLog(),
    ]);

    const initialDow = now.day();
    const initialMinutes = timeToMinutes(now.format("HH:mm"));
    let initialCurrentSchedule = null;

    if ((initialStatus === "STUDYING" || initialStatus === "PAUSED") && activeLog?.schedule) {
        initialCurrentSchedule = allSchedules.find(s => s.id === activeLog.schedule.id) ?? null;
    } else {
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
                initialTime={now.format("h:mm:ss A")}
                initialDow={initialDow}
                initialMinutes={initialMinutes}
                initialCurrentScheduleId={initialCurrentSchedule?.id ?? null}
                initialCanEnd={initialCanEnd}
                initialStatus={initialStatus}
            />
        </main>
    );
}