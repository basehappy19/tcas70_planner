'use server'
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ActiveTestState = {
    id: number;
    subjectId: number;
    totalTime: number;
    timeSpent: number;
    status: "RUNNING" | "PAUSED" | "SCORING";
    inputHours: number;
    inputMinutes: number;
} | null;

export async function getActiveTestState(): Promise<ActiveTestState> {
    const active = await prisma.activeMockTest.findFirst();
    if (!active) return null;

    let currentTimeSpent = active.timeSpent;
    
    if (active.status === "RUNNING" && active.lastStartedAt) {
        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - active.lastStartedAt.getTime()) / 1000);
        currentTimeSpent += diffSeconds;
    }

    let status = active.status;
    if (status === "RUNNING" && currentTimeSpent >= active.totalTime) {
        status = "SCORING";
        currentTimeSpent = active.totalTime;
    }

    return {
        id: active.id,
        subjectId: active.subjectId,
        totalTime: active.totalTime,
        timeSpent: currentTimeSpent,
        status: status as "RUNNING" | "PAUSED" | "SCORING",
        inputHours: active.inputHours,
        inputMinutes: active.inputMinutes,
    };
}

export async function startMockTest(data: { subjectId: number; totalTime: number; inputHours: number; inputMinutes: number }) {
    await prisma.activeMockTest.deleteMany(); // เคลียร์ของเก่า (ถ้ามีค้าง)
    await prisma.activeMockTest.create({
        data: {
            subjectId: data.subjectId,
            totalTime: data.totalTime,
            inputHours: data.inputHours,
            inputMinutes: data.inputMinutes,
            status: "RUNNING",
            lastStartedAt: new Date(),
            timeSpent: 0
        }
    });
    return { success: true };
}

export async function togglePauseResumeMockTest(action: "PAUSE" | "RESUME") {
    const active = await prisma.activeMockTest.findFirst();
    if (!active) return { success: false };

    if (action === "PAUSE" && active.status === "RUNNING") {
        const now = new Date();
        const diff = active.lastStartedAt ? Math.floor((now.getTime() - active.lastStartedAt.getTime()) / 1000) : 0;
        await prisma.activeMockTest.update({
            where: { id: active.id },
            data: {
                status: "PAUSED",
                timeSpent: active.timeSpent + diff,
                lastStartedAt: null
            }
        });
    } else if (action === "RESUME" && active.status === "PAUSED") {
        await prisma.activeMockTest.update({
            where: { id: active.id },
            data: {
                status: "RUNNING",
                lastStartedAt: new Date()
            }
        });
    }
    return { success: true };
}

export async function enterScoringPhase() {
    const active = await prisma.activeMockTest.findFirst();
    if (!active) return { success: false };
    
    let finalTimeSpent = active.timeSpent;
    if (active.status === "RUNNING" && active.lastStartedAt) {
        const now = new Date();
        finalTimeSpent += Math.floor((now.getTime() - active.lastStartedAt.getTime()) / 1000);
    }
    if (finalTimeSpent > active.totalTime) finalTimeSpent = active.totalTime;

    await prisma.activeMockTest.update({
        where: { id: active.id },
        data: {
            status: "SCORING",
            timeSpent: finalTimeSpent,
            lastStartedAt: null
        }
    });
    return { success: true };
}

export async function cancelMockTest() {
    await prisma.activeMockTest.deleteMany();
    return { success: true };
}

export async function addMockTest(formData: FormData) {
    try {
        const subjectId = parseInt(formData.get('subjectId') as string);
        const score = parseFloat(formData.get('score') as string);
        const timeSpent = parseInt(formData.get('timeSpent') as string);
        const notes = formData.get('notes') as string;

        await prisma.mockTest.create({
            data: {
                subjectId,
                score,
                timeSpent,
                notes: notes || null,
            }
        });

        await prisma.activeMockTest.deleteMany();

        revalidatePath('/mocktest');
        return { success: true };
    } catch (error) {
        console.error("Error adding mock test:", error);
        return { success: false, message: "บันทึกข้อมูลไม่สำเร็จ" };
    }
}