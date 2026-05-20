"use server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

const SESSION_COOKIE = "free_study_session_id";

// 1. เปลี่ยนเป็น async และ await cookies()
async function getSessionId() {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

// เริ่ม session ใหม่
export async function startFreeStudySession({ title }: { title: string }) {
    const log = await prisma.freeStudyLog.create({
        data: { title, status: "IN_PROGRESS" },
    });

    // 2. await cookies() ก่อน set
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, String(log.id), { path: "/" });

    await prisma.freeStudyActionLog.create({
        data: { freeStudyLogId: log.id, action: "START" },
    });
    return { success: true, id: log.id };
}

// ดึง state ปัจจุบัน
export async function getFreeStudyState() {
    // 3. await getSessionId()
    const id = await getSessionId();
    if (!id) return null;

    const log = await prisma.freeStudyLog.findFirst({
        where: { id: Number(id), status: { not: "COMPLETED" } },
    });
    if (!log) return null;

    return {
        id: log.id,
        title: log.title,
        status: log.status,
        startedAt: log.startedAt.toISOString(),
    };
}

// Pause / Resume
export async function pauseFreeStudy() {
    const id = await getSessionId();
    if (!id) return { success: false };

    await prisma.freeStudyLog.update({
        where: { id: Number(id) },
        data: { status: "PAUSED" },
    });
    await prisma.freeStudyActionLog.create({
        data: { freeStudyLogId: Number(id), action: "PAUSE" },
    });
    return { success: true };
}

export async function resumeFreeStudy() {
    const id = await getSessionId();
    if (!id) return { success: false };

    await prisma.freeStudyLog.update({
        where: { id: Number(id) },
        data: { status: "IN_PROGRESS" },
    });
    await prisma.freeStudyActionLog.create({
        data: { freeStudyLogId: Number(id), action: "RESUME" },
    });
    return { success: true };
}

// บันทึกโน้ต + รูป
export async function addFreeStudyNote(
    note: string,
    images: { url: string; caption: string }[],
) {
    const id = await getSessionId();
    if (!id) return { success: false };

    await prisma.freeStudyActionLog.create({
        data: {
            freeStudyLogId: Number(id),
            action: "TAKE_NOTE",
            note,
            images: {
                create: images.map((img) => ({
                    url: img.url,
                    caption: img.caption,
                })),
            },
        },
    });
    return { success: true };
}

// จบ session
export async function endFreeStudy() {
    const id = await getSessionId();
    if (!id) return { success: false };

    await prisma.freeStudyLog.update({
        where: { id: Number(id) },
        data: { status: "COMPLETED", endedAt: new Date() },
    });
    await prisma.freeStudyActionLog.create({
        data: { freeStudyLogId: Number(id), action: "END_SESSION" },
    });

    // 4. await cookies() ก่อน delete
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);

    return { success: true };
}
