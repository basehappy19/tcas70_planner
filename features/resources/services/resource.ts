"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ResourceType } from "@prisma/client";

export async function addResource(formData: FormData) {
    try {
        const subjectId = parseInt(formData.get("subjectId") as string);
        const title = formData.get("title") as string;
        const type = formData.get("type") as ResourceType;
        const url = formData.get("url") as string;
        const content = formData.get("content") as string;

        await prisma.resource.create({
            data: {
                subjectId,
                title,
                type,
                url: url || null,
                content: content || null,
            },
        });

        revalidatePath("/resources");
        return { success: true };
    } catch (error) {
        console.error("Error adding resource:", error);
        return { success: false, message: "บันทึกข้อมูลไม่สำเร็จ" };
    }
}

export async function deleteResource(id: number) {
    try {
        await prisma.resource.delete({
            where: { id },
        });
        revalidatePath("/resources");
        return { success: true };
    } catch (error) {
        return { success: false, message: "ลบข้อมูลไม่สำเร็จ" };
    }
}
