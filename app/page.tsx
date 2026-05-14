import prisma from "@/lib/prisma";
import dayjs from "dayjs";
import HeroSection from "./components/HeroSection";

export default async function Page() {
    const bkkTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const initialServerTime = dayjs(bkkTime).format("h:mm:ss A");

    const allSchedules = await prisma.schedule.findMany({
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return (
        <main>
            <HeroSection
                allSchedules={allSchedules}
                initialTime={initialServerTime}
            />
        </main>
    );
}