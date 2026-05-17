"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MockTestActionType } from "../generated/prisma/enums";
import { MockTestStatus } from "../generated/prisma/enums";

export type ActiveTestState = {
    id: number;
    subjectId: number;
    totalTime: number;
    timeSpent: number;
    status: MockTestStatus;
    inputHours: number;
    inputMinutes: number;
} | null;

/* ════════════════════════════════════════
   UTILITIES (Timezone เหมือน StudyLog)
════════════════════════════════════════ */

function getThaiNow() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

/* ════════════════════════════════════════
   GET ACTIVE SESSION
════════════════════════════════════════ */

async function getActiveSession() {
    return await prisma.mockTest.findFirst({
        where: {
            status: { in: ["RUNNING", "PAUSED", "SCORING"] }
        },
        orderBy: { id: "desc" },
    });
}

/* ════════════════════════════════════════
   CREATE SNAPSHOT (เหมือน addActionLogToDB ของ StudyLog)
════════════════════════════════════════ */

async function createSnapshot(
    mockTestId: number,
    action: MockTestActionType,
    note?: string,
    images?: { url: string; caption?: string }[]
) {
    const now = getThaiNow();
    
    return prisma.mockTestActionLog.create({
        data: {
            mockTestId,
            action,
            note: note ?? null,
            time: now,
            images: images && images.length > 0 ? {
                create: images.map(img => ({
                    url: img.url,
                    caption: img.caption ?? null,
                    createdAt: now
                }))
            } : undefined,
        },
    });
}

/* ════════════════════════════════════════
   CALC TIME
════════════════════════════════════════ */

function calculateTimeSpent(active: {
    timeSpent: number;
    lastStartedAt: Date | null;
    status: string;
}) {
    if (active.status !== "RUNNING" || !active.lastStartedAt) {
        return active.timeSpent;
    }

    const now = getThaiNow();
    return (
        active.timeSpent +
        Math.floor((now.getTime() - active.lastStartedAt.getTime()) / 1000)
    );
}

/* ════════════════════════════════════════
   GET CURRENT STATE
════════════════════════════════════════ */

export async function getActiveTestState(): Promise<ActiveTestState> {
    const active = await getActiveSession();
    if (!active) return null;

    let timeSpent = calculateTimeSpent(active);
    let status = active.status as MockTestStatus;

    if (status === "RUNNING" && timeSpent >= active.totalTime) {
        status = "SCORING";
        timeSpent = active.totalTime;
    }

    return {
        id: active.id,
        subjectId: active.subjectId,
        totalTime: active.totalTime,
        timeSpent,
        status,
        inputHours: active.inputHours,
        inputMinutes: active.inputMinutes,
    };
}

/* ════════════════════════════════════════
   START SESSION
════════════════════════════════════════ */

export async function startMockTest(data: {
    subjectId: number;
    totalTime: number;
    inputHours: number;
    inputMinutes: number;
}) {
    const now = getThaiNow();
    
    const session = await prisma.mockTest.create({
        data: {
            subjectId: data.subjectId,
            totalTime: data.totalTime,
            inputHours: data.inputHours,
            inputMinutes: data.inputMinutes,
            status: "RUNNING",
            lastStartedAt: now,
            timeSpent: 0,
            createdAt: now,
            updatedAt: now,
        },
    });

    await createSnapshot(session.id, "START");

    revalidatePath("/mocktest");
    return { success: true };
}

/* ════════════════════════════════════════
   PAUSE / RESUME
════════════════════════════════════════ */

export async function togglePauseResumeMockTest(
    action: "PAUSE" | "RESUME"
) {
    const active = await getActiveSession();
    if (!active) return { success: false };

    const now = getThaiNow();

    if (action === "PAUSE" && active.status === "RUNNING") {
        const timeSpent = calculateTimeSpent(active);

        const updated = await prisma.mockTest.update({
            where: { id: active.id },
            data: {
                status: "PAUSED",
                timeSpent,
                lastStartedAt: null,
                updatedAt: now,
            },
        });

        await createSnapshot(updated.id, "PAUSE");
    }

    if (action === "RESUME" && active.status === "PAUSED") {
        const updated = await prisma.mockTest.update({
            where: { id: active.id },
            data: {
                status: "RUNNING",
                lastStartedAt: now,
                updatedAt: now,
            },
        });

        await createSnapshot(updated.id, "RESUME");
    }

    revalidatePath("/mocktest");
    return { success: true };
}

/* ════════════════════════════════════════
   ENTER SCORING 
════════════════════════════════════════ */

export async function enterScoringPhase() {
    const active = await getActiveSession();
    if (!active) return { success: false };

    const now = getThaiNow();
    let timeSpent = calculateTimeSpent(active);
    timeSpent = Math.min(timeSpent, active.totalTime);

    const updated = await prisma.mockTest.update({
        where: { id: active.id },
        data: {
            status: "SCORING",
            timeSpent,
            lastStartedAt: null,
            updatedAt: now,
        },
    });

    await createSnapshot(updated.id, "SCORING");

    revalidatePath("/mocktest");
    return { success: true };
}

/* ════════════════════════════════════════
   CANCEL SESSION
════════════════════════════════════════ */

export async function cancelMockTest() {
    const active = await getActiveSession();

    if (active) {
        await prisma.mockTest.delete({
            where: { id: active.id },
        });
    }

    revalidatePath("/mocktest");
    return { success: true };
}

/* ════════════════════════════════════════
   NOTE (รวมการบันทึกภาพพร้อมแคปชั่นเข้าด้วยกัน)
════════════════════════════════════════ */

export async function addMockTestNote(data: { 
    note?: string;
    images?: { url: string; caption?: string }[];
}) {
    const active = await getActiveSession();
    if (!active) return { success: false, message: "ไม่พบเซสชันสอบ" };

    if (!data.note && (!data.images || data.images.length === 0)) {
        return { success: false, message: "ไม่มีข้อมูลให้บันทึก" };
    }

    await createSnapshot(active.id, "NOTE", data.note, data.images);

    revalidatePath("/mocktest");
    return { success: true };
}

/* ════════════════════════════════════════
   FINAL RESULT / FINISH
════════════════════════════════════════ */

export async function finishMockTest(formData: FormData) {
    try {
        const active = await getActiveSession();
        if (!active) return { success: false };

        const now = getThaiNow();
        const finalTimeSpent = calculateTimeSpent(active);

        // โครงสร้าง MockTest ใหม่ไม่มี field score & notes โดยตรง
        // จึงอัปเดต status เป็น COMPLETED และนำคะแนนไปใส่ใน ActionLog(FINISH)
        await prisma.mockTest.update({
            where: { id: active.id },
            data: {
                status: "COMPLETED",
                timeSpent: finalTimeSpent,
                lastStartedAt: null,
                updatedAt: now,
            },
        });

        const score = formData.get("score")?.toString() || "";
        const notes = formData.get("notes")?.toString() || "";
        
        let finalNoteStr = `สิ้นสุดการทำสอบ | คะแนน: ${score}`;
        if (notes) finalNoteStr += `\n\nบันทึกเพิ่มเติม:\n${notes}`;

        await createSnapshot(active.id, "FINISH", finalNoteStr);

        revalidatePath("/mocktest");

        return { success: true };
    } catch (e) {
        console.error(e);
        return {
            success: false,
            message: "บันทึกข้อมูลไม่สำเร็จ",
        };
    }
}