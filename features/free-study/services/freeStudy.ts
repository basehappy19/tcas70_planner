"use server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import dayjs from "@/lib/dayjs";

const SESSION_COOKIE = "free_study_session_id";

async function getSessionId() {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function startFreeStudySession({ title }: { title: string }) {
    const log = await prisma.freeStudyLog.create({
        data: { title, status: "IN_PROGRESS" },
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, String(log.id), { path: "/" });

    await prisma.freeStudyActionLog.create({
        data: { freeStudyLogId: log.id, action: "START" },
    });
    return { success: true, id: log.id };
}

export async function getFreeStudyState() {
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

export async function pauseFreeStudy() {
    const id = await getSessionId();
    if (!id) return { success: false };

    const [updatedLog] = await prisma.$transaction([
        prisma.freeStudyLog.update({ where: { id: Number(id) }, data: { status: "PAUSED" } }),
        prisma.freeStudyActionLog.create({ data: { freeStudyLogId: Number(id), action: "PAUSE" } })
    ]);
    return { success: true };
}

export async function resumeFreeStudy() {
    const id = await getSessionId();
    if (!id) return { success: false };

    const [updatedLog] = await prisma.$transaction([
        prisma.freeStudyLog.update({ where: { id: Number(id) }, data: { status: "IN_PROGRESS" } }),
        prisma.freeStudyActionLog.create({ data: { freeStudyLogId: Number(id), action: "RESUME" } })
    ]);
    return { success: true };
}

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

export async function endFreeStudy() {
    const id = await getSessionId();
    if (!id) return { success: false };

    await prisma.$transaction([
        prisma.freeStudyLog.update({ where: { id: Number(id) }, data: { status: "COMPLETED", endedAt: dayjs().toDate() } }),
        prisma.freeStudyActionLog.create({ data: { freeStudyLogId: Number(id), action: "END_SESSION" } })
    ]);

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);

    return { success: true };
}
