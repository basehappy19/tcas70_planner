'use server'
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
        const history = await prisma.studyLog.findMany({
            where: { scheduleId },
            orderBy: { date: 'desc' },
            include: {
                actionLogs: {
                    orderBy: { time: 'asc' },
                    include: {         
                        images: true    
                    }
                }
            }
        });
        return { success: true, data: history };
    } catch (error) {
        return { success: false };
    }
}