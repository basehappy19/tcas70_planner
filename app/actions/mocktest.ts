"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MockTestActionType, MockTestStatus } from "../generated/prisma/enums";

export type ActiveTestState = {
    id: number;
    subjectId: number;
    status: MockTestStatus;
} | null;

function getThaiNow() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

async function getActiveSession() {
    return await prisma.mockTest.findFirst({
        where: { status: { in: ["RUNNING", "PAUSED", "SCORING"] } },
        orderBy: { id: "desc" },
    });
}

async function createSnapshot(
    mockTestId: number,
    action: MockTestActionType,
    note?: string,
    images?: { url: string; caption?: string }[]
) {
    return prisma.mockTestActionLog.create({
        data: {
            mockTestId,
            action,
            note: note ?? null,
            time: getThaiNow(),
            images: images?.length ? {
                create: images.map(img => ({
                    url: img.url,
                    caption: img.caption ?? null,
                    createdAt: getThaiNow(),
                }))
            } : undefined,
        },
    });
}

export async function getActiveTestState(): Promise<ActiveTestState> {
    const active = await getActiveSession();
    if (!active) return null;
    return {
        id: active.id,
        subjectId: active.subjectId,
        status: active.status,
    };
}

export async function startMockTest(data: { subjectId: number }) {
    const now = getThaiNow();
    const session = await prisma.mockTest.create({
        data: {
            subjectId: data.subjectId,
            status: "RUNNING",
            createdAt: now,
            updatedAt: now,
        },
    });
    await createSnapshot(session.id, "START");
    revalidatePath("/mocktest");
    return { success: true };
}

export async function togglePauseResumeMockTest(action: "PAUSE" | "RESUME") {
    const active = await getActiveSession();
    if (!active) return { success: false };

    const newStatus = action === "PAUSE" ? "PAUSED" : "RUNNING";
    const updated = await prisma.mockTest.update({
        where: { id: active.id },
        data: { status: newStatus, updatedAt: getThaiNow() },
    });
    await createSnapshot(updated.id, action);
    revalidatePath("/mocktest");
    return { success: true };
}

export async function enterScoringPhase() {
    const active = await getActiveSession();
    if (!active) return { success: false };

    const updated = await prisma.mockTest.update({
        where: { id: active.id },
        data: { status: "SCORING", updatedAt: getThaiNow() },
    });
    await createSnapshot(updated.id, "SCORING");
    revalidatePath("/mocktest");
    return { success: true };
}

export async function cancelMockTest() {
    const active = await getActiveSession();
    if (active) {
        await prisma.$transaction([
            prisma.mockTestImage.deleteMany({
                where: { actionLog: { mockTestId: active.id } },
            }),
            prisma.mockTestActionLog.deleteMany({
                where: { mockTestId: active.id },
            }),
            prisma.mockTest.delete({
                where: { id: active.id },
            }),
        ]);
    }
    revalidatePath("/mocktest");
    return { success: true };
}

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

export async function finishMockTest(formData: FormData) {
    try {
        const active = await getActiveSession();
        if (!active) return { success: false };

        const score = parseFloat(formData.get("score")?.toString() || "0");
        const notes = formData.get("notes")?.toString() || "";

        await prisma.mockTest.update({
            where: { id: active.id },
            data: {
                status: "COMPLETED",
                score,
                updatedAt: getThaiNow(),
            },
        });

        await createSnapshot(active.id, "FINISH", notes || undefined);

        revalidatePath("/mocktest");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, message: "บันทึกข้อมูลไม่สำเร็จ" };
    }
}

export async function backToRunning() {
    const active = await getActiveSession();
    if (!active) return { success: false };

    const updated = await prisma.mockTest.update({
        where: { id: active.id },
        data: { status: "RUNNING", updatedAt: getThaiNow() },
    });

    await createSnapshot(updated.id, "RESUME");
    revalidatePath("/mocktest");
    return { success: true };
}