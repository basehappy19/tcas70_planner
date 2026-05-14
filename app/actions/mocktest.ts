'use server'
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

        revalidatePath('/mocktest');
        return { success: true };
    } catch (error) {
        console.error("Error adding mock test:", error);
        return { success: false, message: "บันทึกข้อมูลไม่สำเร็จ" };
    }
}