import { PrismaClient, Prisma } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

const scheduleData: Prisma.ScheduleCreateInput[] = [
    // วันจันทร์ (1)
    {
        dayOfWeek: 1,
        startTime: "19:00",
        endTime: "20:30",
        title: "TPAT 3",
        type: "CONTENT",
    },
    {
        dayOfWeek: 1,
        startTime: "20:45",
        endTime: "22:00",
        title: "TGAT 1",
        type: "CONTENT",
    },

    // วันอังคาร (2)
    {
        dayOfWeek: 2,
        startTime: "19:00",
        endTime: "20:30",
        title: "TPAT 3",
        type: "CONTENT",
    },
    {
        dayOfWeek: 2,
        startTime: "20:45",
        endTime: "22:00",
        title: "TPAT 3",
        type: "CONTENT",
    },

    // วันพุธ (3)
    {
        dayOfWeek: 3,
        startTime: "19:00",
        endTime: "20:30",
        title: "TGAT 2",
        type: "CONTENT",
    },
    {
        dayOfWeek: 3,
        startTime: "20:45",
        endTime: "22:00",
        title: "TPAT 3",
        type: "CONTENT",
    },

    // วันพฤหัสบดี (4)
    {
        dayOfWeek: 4,
        startTime: "19:00",
        endTime: "20:30",
        title: "TPAT 3",
        type: "CONTENT",
    },
    {
        dayOfWeek: 4,
        startTime: "20:45",
        endTime: "22:00",
        title: "TGAT 3",
        type: "CONTENT",
    },

    // วันศุกร์ (5)
    {
        dayOfWeek: 5,
        startTime: "19:00",
        endTime: "20:30",
        title: "TPAT 3",
        type: "CONTENT",
    },
    {
        dayOfWeek: 5,
        startTime: "20:45",
        endTime: "22:00",
        title: "TPAT 3",
        type: "CONTENT",
    },

    // วันเสาร์ (6)
    {
        dayOfWeek: 6,
        startTime: "09:00",
        endTime: "12:00",
        title: "TPAT3 Mock Test",
        type: "MOCK_TEST",
    },
    {
        dayOfWeek: 6,
        startTime: "12:00",
        endTime: "13:30",
        title: "Free Time",
        type: "FREE_TIME",
    },
    {
        dayOfWeek: 6,
        startTime: "13:30",
        endTime: "16:30",
        title: "TPAT3",
        type: "CONTENT",
    },
    {
        dayOfWeek: 6,
        startTime: "16:30",
        endTime: "19:00",
        title: "Free Time",
        type: "FREE_TIME",
    },
    {
        dayOfWeek: 6,
        startTime: "19:00",
        endTime: "21:00",
        title: "Summary: สรุปสูตรหรือเทคนิคที่ได้จากวันนี้ลงในบันทึก",
        type: "CONTENT",
    },

    // วันอาทิตย์ (0)
    {
        dayOfWeek: 0,
        startTime: "09:00",
        endTime: "12:00",
        title: "TGAT 1, 2, 3 Mock Test",
        type: "MOCK_TEST",
    },
    {
        dayOfWeek: 0,
        startTime: "12:00",
        endTime: "13:30",
        title: "Free Time",
        type: "FREE_TIME",
    },
    {
        dayOfWeek: 0,
        startTime: "13:30",
        endTime: "16:30",
        title: "Review & Fix",
        type: "CONTENT",
    },
    {
        dayOfWeek: 0,
        startTime: "16:30",
        endTime: "19:00",
        title: "Free Time",
        type: "FREE_TIME",
    },
    {
        dayOfWeek: 0,
        startTime: "19:00",
        endTime: "21:00",
        title: "Weekly Progress: เช็กภาพรวมว่าเราเก็บไปได้กี่ %",
        type: "CONTENT",
    },
];

export async function main() {
    for (const s of scheduleData) {
        await prisma.schedule.create({ data: s });
    }
    console.log("✅ Inserted all schedules successfully!");
}

main();
