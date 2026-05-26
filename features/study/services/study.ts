'use server'

import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { StudyActionType } from "@prisma/client";
import dayjs from "@/lib/dayjs";

async function getActiveSession() {
    noStore();
    const now = dayjs();
    return await prisma.studyLog.findFirst({
        where: {
            status: "STUDYING",
            date: { gte: now.startOf('day').toDate() },
        },
        orderBy: { id: "desc" },
    });
}

export async function getCurrentSessionState(): Promise<"IDLE" | "STUDYING" | "PAUSED"> {
    noStore();
    try {
        const activeSession = await getActiveSession();
        if (!activeSession) return "IDLE";

        const latestAction = await prisma.studyActionLog.findFirst({
            where: {
                studyLogId: activeSession.id,
                action: { in: ["PAUSE", "RESUME", "START_ON_TIME", "START_LATE"] }
            },
            orderBy: { id: "desc" }
        });

        return latestAction?.action === "PAUSE" ? "PAUSED" : "STUDYING";
    } catch (e) {
        console.error("Error fetching current state:", e);
        return "IDLE";
    }
}

export async function createStudySession({ scheduleId }: { scheduleId: number }) {
    try {
        const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
        if (!schedule) return { success: false, message: "ไม่พบตารางเรียน" };

        const now = dayjs();
        const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
        const scheduledTime = now.clone().hour(startHour).minute(startMinute).second(0).millisecond(0);

        const diffMs = now.diff(scheduledTime);
        const delayMinutes = Math.floor(diffMs / 60000);
        
        let action: StudyActionType = "START_ON_TIME";
        let note: string | undefined = undefined;

        if (delayMinutes > 0) {
            action = "START_LATE";
            note = `เข้าสาย ${delayMinutes} นาที`;
        } else if (delayMinutes < 0) {
            action = "START_EARLY";
            note = `เข้าเรียนก่อนเวลา ${Math.abs(delayMinutes)} นาที`;
        }

        const newSession = await prisma.studyLog.create({
            data: {
                scheduleId: schedule.id,
                delayMinutes: Math.max(0, delayMinutes),
                status: "STUDYING",
                actualStartAt: now.toDate(),
                date: now.startOf('day').toDate(),
            },
        });

        await prisma.studyActionLog.create({
            data: {
                studyLogId: newSession.id,
                action: action,
                note: note,
            }
        });

        return { success: true, delayMinutes };
    } catch (error) {
        console.error(error);
        return { success: false, message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" };
    }
}

export async function addActionLogToDB(
    action: StudyActionType,
    note?: string,
    images?: { url: string; caption?: string }[]
) {
    try {
        const activeSession = await getActiveSession();
        if (!activeSession) return { success: false, message: "ไม่พบเซสชันที่กำลังดำเนินอยู่" };

        await prisma.studyActionLog.create({
            data: {
                studyLogId: activeSession.id,
                action,
                note,
                images: images && images.length > 0 ? {
                    create: images.map(img => ({
                        url: img.url,
                        caption: img.caption
                    }))
                } : undefined,
            },
        });

        return { success: true };
    } catch (e) {
        console.error("Error in addActionLogToDB:", e);
        return { success: false };
    }
}

export async function finishStudySession() {
    try {
        const activeSession = await getActiveSession();
        if (!activeSession) return { success: false };

        await prisma.studyLog.update({
            where: { id: activeSession.id },
            data: { status: "COMPLETED" },
        });
        return { success: true };
    } catch (e) {
        console.error("Error in finishStudySession:", e);
        return { success: false };
    }
}

export async function getLatestSchedules() {
    noStore();
    try {
        const schedules = await prisma.schedule.findMany({
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        });
        return { success: true, schedules };
    } catch (e) {
        console.error(e);
        return { success: false, schedules: [] };
    }
}