'use server'
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import dayjs from "dayjs";

export async function updateSchedule(id: number, data: { title: string, startTime: string, endTime: string }) {
    try {
        await prisma.schedule.update({
            where: { id },
            data: {
                title: data.title,
                startTime: data.startTime,
                endTime: data.endTime,
            }
        });
        revalidatePath('/schedule');
        return { success: true };
    } catch (e) {
        return { success: false, message: "ไม่สามารถอัปเดตตารางได้" };
    }
}

export async function getScheduleHistory(scheduleId: number) {
    try {
        // 1. ดึง scheduled logs ปกติ
        const scheduledLogs = await prisma.studyLog.findMany({
            where: { scheduleId },
            orderBy: { date: 'desc' },
            include: {
                actionLogs: {
                    orderBy: { time: 'asc' },
                    include: { images: true }
                }
            }
        });

        // 2. ถ้ายังไม่มี session เลย ไม่ต้องดึง free study
        if (scheduledLogs.length === 0) {
            return {
                success: true,
                data: { scheduledLogs: [], freeStudyLogs: [] }
            };
        }

        // 3. หาช่วงวันจาก scheduled logs — ดึง free study เฉพาะวันที่ซ้อนกัน
        const bkkNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        const dates = scheduledLogs.map(l => dayjs(l.date).startOf("day").toDate());
        const minDate = dates.reduce((a, b) => (a < b ? a : b));

        const freeStudyLogs = await prisma.freeStudyLog.findMany({
            where: {
                status: "COMPLETED",
                startedAt: { gte: minDate, lte: bkkNow },
            },
            orderBy: { startedAt: 'asc' },
            include: {
                actionLogs: {
                    orderBy: { time: 'asc' },
                    include: { images: true }
                }
            }
        });

        return {
            success: true,
            data: { scheduledLogs, freeStudyLogs }
        };
    } catch (error) {
        console.error("[getScheduleHistory]", error);
        return { success: false, data: null };
    }
}