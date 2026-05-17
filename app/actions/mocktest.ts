"use server";

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

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */

async function createSnapshot(
    activeTestId: number,
    type: "START" | "PAUSE" | "RESUME" | "SCORING" | "NOTE",
    note?: string,
) {
    const active = await prisma.activeMockTest.findUnique({
        where: { id: activeTestId },
    });

    if (!active) return null;

    return await prisma.mockTestSnapshot.create({
        data: {
            activeMockTestId: active.id,

            type,

            timeSpent: active.timeSpent,

            remaining: Math.max(0, active.totalTime - active.timeSpent),

            note: note ?? null,
        },
    });
}

/* ════════════════════════════════════════
   GET ACTIVE TEST
════════════════════════════════════════ */

export async function getActiveTestState(): Promise<ActiveTestState> {
    const active = await prisma.activeMockTest.findFirst();

    if (!active) return null;

    let currentTimeSpent = active.timeSpent;

    if (active.status === "RUNNING" && active.lastStartedAt) {
        const now = new Date();

        const diffSeconds = Math.floor(
            (now.getTime() - active.lastStartedAt.getTime()) / 1000,
        );

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

/* ════════════════════════════════════════
   START TEST
════════════════════════════════════════ */

export async function startMockTest(data: {
    subjectId: number;
    totalTime: number;
    inputHours: number;
    inputMinutes: number;
}) {
    await prisma.activeMockTest.deleteMany();

    const created = await prisma.activeMockTest.create({
        data: {
            subjectId: data.subjectId,

            totalTime: data.totalTime,

            inputHours: data.inputHours,
            inputMinutes: data.inputMinutes,

            status: "RUNNING",

            lastStartedAt: new Date(),

            timeSpent: 0,
        },
    });

    // AUTO SNAPSHOT
    await createSnapshot(created.id, "START");

    revalidatePath("/mocktest");

    return {
        success: true,
    };
}

/* ════════════════════════════════════════
   PAUSE / RESUME
════════════════════════════════════════ */

export async function togglePauseResumeMockTest(action: "PAUSE" | "RESUME") {
    const active = await prisma.activeMockTest.findFirst();

    if (!active) {
        return {
            success: false,
        };
    }

    /* ───── PAUSE ───── */

    if (action === "PAUSE" && active.status === "RUNNING") {
        const now = new Date();

        const diff = active.lastStartedAt
            ? Math.floor(
                  (now.getTime() - active.lastStartedAt.getTime()) / 1000,
              )
            : 0;

        const updated = await prisma.activeMockTest.update({
            where: {
                id: active.id,
            },
            data: {
                status: "PAUSED",

                timeSpent: active.timeSpent + diff,

                lastStartedAt: null,
            },
        });

        // AUTO SNAPSHOT
        await createSnapshot(updated.id, "PAUSE");
    } else if (action === "RESUME" && active.status === "PAUSED") {
        /* ───── RESUME ───── */
        const updated = await prisma.activeMockTest.update({
            where: {
                id: active.id,
            },
            data: {
                status: "RUNNING",

                lastStartedAt: new Date(),
            },
        });

        // AUTO SNAPSHOT
        await createSnapshot(updated.id, "RESUME");
    }

    revalidatePath("/mocktest");

    return {
        success: true,
    };
}

/* ════════════════════════════════════════
   ENTER SCORING
════════════════════════════════════════ */

export async function enterScoringPhase() {
    const active = await prisma.activeMockTest.findFirst();

    if (!active) {
        return {
            success: false,
        };
    }

    let finalTimeSpent = active.timeSpent;

    if (active.status === "RUNNING" && active.lastStartedAt) {
        const now = new Date();

        finalTimeSpent += Math.floor(
            (now.getTime() - active.lastStartedAt.getTime()) / 1000,
        );
    }

    if (finalTimeSpent > active.totalTime) {
        finalTimeSpent = active.totalTime;
    }

    const updated = await prisma.activeMockTest.update({
        where: {
            id: active.id,
        },
        data: {
            status: "SCORING",

            timeSpent: finalTimeSpent,

            lastStartedAt: null,
        },
    });

    // AUTO SNAPSHOT
    await createSnapshot(updated.id, "SCORING");

    revalidatePath("/mocktest");

    return {
        success: true,
    };
}

/* ════════════════════════════════════════
   CANCEL TEST
════════════════════════════════════════ */

export async function cancelMockTest() {
    await prisma.activeMockTest.deleteMany();

    revalidatePath("/mocktest");

    return {
        success: true,
    };
}

/* ════════════════════════════════════════
   ADD NOTE
════════════════════════════════════════ */

export async function addMockTestNote(data: { note: string }) {
    try {
        const active = await prisma.activeMockTest.findFirst();

        if (!active) {
            return {
                success: false,
                message: "ไม่มีการสอบที่กำลังทำอยู่",
            };
        }

        const snapshot = await createSnapshot(active.id, "NOTE", data.note);

        return {
            success: true,
            snapshotId: snapshot?.id,
        };
    } catch (error) {
        console.error("Error adding note:", error);

        return {
            success: false,
            message: "บันทึกโน้ตไม่สำเร็จ",
        };
    }
}

/* ════════════════════════════════════════
   ADD NOTE IMAGE
════════════════════════════════════════ */

export async function addMockTestNoteImage(data: {
    snapshotId: number;
    url: string;
    caption?: string;
}) {
    try {
        await prisma.mockTestSnapshotImage.create({
            data: {
                snapshotId: data.snapshotId,

                url: data.url,

                caption: data.caption || null,
            },
        });

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error adding note image:", error);

        return {
            success: false,
            message: "เพิ่มรูปไม่สำเร็จ",
        };
    }
}

/* ════════════════════════════════════════
   SAVE FINAL TEST RESULT
════════════════════════════════════════ */

export async function addMockTest(formData: FormData) {
    try {
        const subjectId = parseInt(formData.get("subjectId") as string);

        const score = parseFloat(formData.get("score") as string);

        const timeSpent = parseInt(formData.get("timeSpent") as string);

        const notes = formData.get("notes") as string;
        const active = await prisma.activeMockTest.findFirst();

        if (active) {
            await prisma.activeMockTest.delete({
                where: {
                    id: active.id,
                },
            });
        }

        await prisma.mockTest.create({
            data: {
                subjectId,

                score,

                timeSpent,

                notes: notes || null,
            },
        });

        revalidatePath("/mocktest");

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error adding mock test:", error);

        return {
            success: false,
            message: "บันทึกข้อมูลไม่สำเร็จ",
        };
    }
}
