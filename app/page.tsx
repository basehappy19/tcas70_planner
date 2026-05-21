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

export default async function Page() {
    const bkkTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const now = dayjs(bkkTime);

    const initialServerTime = now.format("h:mm:ss A");
    const initialDow = now.day();
    const initialMinutes = timeToMinutes(now.format("HH:mm"));

    const allSchedules = await prisma.schedule.findMany({
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    // Compute current schedule on server so client shows correct data immediately
    const initialCurrentSchedule =
        allSchedules.find(
            (s) =>
                s.dayOfWeek === initialDow &&
                timeToMinutes(s.startTime) <= initialMinutes &&
                timeToMinutes(s.endTime) >= initialMinutes
        ) ?? null;

    // canEndSession: true only if current time >= schedule end time
    const initialCanEnd = initialCurrentSchedule
        ? initialMinutes >= timeToMinutes(initialCurrentSchedule.endTime)
        : false;

    const initialStatus = await getCurrentSessionState();

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