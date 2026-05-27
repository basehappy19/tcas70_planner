'use server'

import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import dayjs from "@/lib/dayjs";
import { revalidatePath } from "next/cache";

export async function getStudyHistory(query?: string) {
    noStore();
    try {
        const studyLogs = await prisma.studyLog.findMany({
            where: {
                OR: [
                    { schedule: { title: { contains: query, mode: 'insensitive' } } },
                    { actionLogs: { some: { note: { contains: query, mode: 'insensitive' } } } }
                ]
            },
            include: {
                schedule: true,
                actionLogs: {
                    include: {
                        images: true
                    },
                    orderBy: { time: 'asc' }
                }
            },
            orderBy: { date: 'desc' }
        });

        const freeStudyLogs = await prisma.freeStudyLog.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { actionLogs: { some: { note: { contains: query, mode: 'insensitive' } } } }
                ]
            },
            include: {
                actionLogs: {
                    include: {
                        images: true
                    },
                    orderBy: { time: 'asc' }
                }
            },
            orderBy: { startedAt: 'desc' }
        });

        // Combine and sort
        const history = [
            ...studyLogs.map(log => ({
                id: log.id,
                type: 'SCHEDULED' as const,
                title: log.schedule.title,
                date: log.date,
                startTime: log.actualStartAt,
                status: log.status,
                aiSummary: log.aiSummary,
                actionLogs: log.actionLogs,
                schedule: log.schedule
            })),
            ...freeStudyLogs.map(log => ({
                id: log.id,
                type: 'FREE' as const,
                title: log.title,
                date: log.startedAt,
                startTime: log.startedAt,
                status: log.status,
                aiSummary: log.aiSummary,
                actionLogs: log.actionLogs,
                schedule: null
            }))
        ].sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());

        return { success: true, history };
    } catch (e) {
        console.error("Error fetching history:", e);
        return { success: false, history: [] };
    }
}

export async function deleteStudyLog(id: number, type: 'SCHEDULED' | 'FREE') {
    try {
        if (type === 'SCHEDULED') {
            // Delete images first if not using cascade (Prisma handles it if defined)
            await prisma.studyLog.delete({ where: { id } });
        } else {
            await prisma.freeStudyLog.delete({ where: { id } });
        }
        revalidatePath('/history');
        return { success: true };
    } catch (e) {
        console.error("Error deleting log:", e);
        return { success: false, message: "ลบไม่สำเร็จ" };
    }
}

export async function updateActionNote(actionLogId: number, type: 'SCHEDULED' | 'FREE', note: string) {
    try {
        if (type === 'SCHEDULED') {
            await prisma.studyActionLog.update({
                where: { id: actionLogId },
                data: { note }
            });
        } else {
            await prisma.freeStudyActionLog.update({
                where: { id: actionLogId },
                data: { note }
            });
        }
        revalidatePath('/history');
        return { success: true };
    } catch (e) {
        console.error("Error updating note:", e);
        return { success: false, message: "บันทึกไม่สำเร็จ" };
    }
}

export async function generateAISummary(logId: number, type: 'SCHEDULED' | 'FREE') {
    try {
        // Fetch full log details to provide context to "AI"
        let content = "";
        if (type === 'SCHEDULED') {
            const log = await prisma.studyLog.findUnique({
                where: { id: logId },
                include: { schedule: true, actionLogs: true }
            });
            if (!log) throw new Error("Log not found");
            content = `วิชา: ${log.schedule.title}\nบันทึก: ${log.actionLogs.map(al => al.note).join(", ")}`;
        } else {
            const log = await prisma.freeStudyLog.findUnique({
                where: { id: logId },
                include: { actionLogs: true }
            });
            if (!log) throw new Error("Log not found");
            content = `หัวข้อ: ${log.title}\nบันทึก: ${log.actionLogs.map(al => al.note).join(", ")}`;
        }

        // Simulated AI logic
        const summary = `วันนี้เรียนเรื่อง ${type === 'SCHEDULED' ? 'ตามตาราง' : 'นอกตาราง'} โดยเน้นไปที่เนื้อหาสำคัญคือการจดบันทึกและทบทวนความเข้าใจ มีการจดโน๊ตไปทั้งหมด ${content.split(',').length} จุด \n\nสิ่งที่ควรทบทวน: ควรกลับไปดูเนื้อหาในส่วนที่มีการจดบันทึกเพิ่มเติมเพื่อความแม่นยำ`;

        if (type === 'SCHEDULED') {
            await prisma.studyLog.update({
                where: { id: logId },
                data: { aiSummary: summary }
            });
        } else {
            await prisma.freeStudyLog.update({
                where: { id: logId },
                data: { aiSummary: summary }
            });
        }

        revalidatePath('/history');
        return { success: true, summary };
    } catch (e) {
        console.error("Error generating AI summary:", e);
        return { success: false, message: "สรุปไม่สำเร็จ" };
    }
}

export async function getDashboardStats() {
    noStore();
    try {
        const now = dayjs();
        const examDate = dayjs("2027-01-30");
        const daysToExam = examDate.diff(now, 'day');

        // Total hours (approximate from schedules)
        const completedLogs = await prisma.studyLog.findMany({
            where: { status: "COMPLETED" },
            include: { schedule: true }
        });

        const freeLogs = await prisma.freeStudyLog.findMany({
            where: { status: "COMPLETED" }
        });

        let totalMinutes = 0;
        completedLogs.forEach(log => {
            const [sh, sm] = log.schedule.startTime.split(":").map(Number);
            const [eh, em] = log.schedule.endTime.split(":").map(Number);
            totalMinutes += (eh * 60 + em) - (sh * 60 + sm);
        });

        freeLogs.forEach(log => {
            if (log.startedAt && log.endedAt) {
                totalMinutes += dayjs(log.endedAt).diff(dayjs(log.startedAt), 'minute');
            }
        });

        // Days studied (unique days with at least one completed session)
        const studyDates = new Set(completedLogs.map(l => dayjs(l.date).format("YYYY-MM-DD")));
        const freeStudyDates = new Set(freeLogs.map(l => dayjs(l.startedAt).format("YYYY-MM-DD")));
        const allStudyDates = new Set([...studyDates, ...freeStudyDates]);

        return {
            success: true,
            stats: {
                totalDays: allStudyDates.size,
                totalHours: (totalMinutes / 60).toFixed(1),
                totalSessions: completedLogs.length + freeLogs.length,
                daysToExam: Math.max(0, daysToExam)
            }
        };
    } catch (e) {
        console.error("Error fetching stats:", e);
        return { success: false, stats: { totalDays: 0, totalHours: "0", totalSessions: 0, daysToExam: 0 } };
    }
}
