import prisma from "@/lib/prisma";
import dayjs from "dayjs";
import HeroSection from "./components/HeroSection";

export default async function Page() {
    const bkkTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const initialServerTime = dayjs(bkkTime).format("hh:mm:ss A");

    const currentSchedule = await prisma.schedule.findFirst({
    where: {
      dayOfWeek: dayjs().day(),
      startTime: {
        lte: dayjs().format("HH:mm"),
      },
      endTime: {
        gte: dayjs().format("HH:mm"),
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });
    return (
        <main>
            <HeroSection 
                id={currentSchedule?.id}
                title={currentSchedule?.title}
                startTime={currentSchedule?.startTime}
                endTime={currentSchedule?.endTime}
                initialTime={initialServerTime} 
            />
        </main>
    );
}