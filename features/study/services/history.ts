'use server'

import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import dayjs from "@/lib/dayjs";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
        ].sort((a, b) => {
            const dateDiff = dayjs(b.date).startOf('day').unix() - dayjs(a.date).startOf('day').unix();
            if (dateDiff !== 0) return dateDiff;
            
            // If same day, sort by startTime descending (newest time first)
            const timeA = a.startTime ? dayjs(a.startTime).unix() : 0;
            const timeB = b.startTime ? dayjs(b.startTime).unix() : 0;
            return timeB - timeA;
        });

        return { success: true, history };
    } catch (e) {
        console.error("Error fetching history:", e);
        return { success: false, history: [] };
    }
}

export async function deleteStudyLog(id: number, type: 'SCHEDULED' | 'FREE') {
    try {
        if (type === 'SCHEDULED') {
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
        let title = "";
        let notes: string[] = [];
        let duration = "ไม่ระบุ";
        
        if (type === 'SCHEDULED') {
            const log = await prisma.studyLog.findUnique({
                where: { id: logId },
                include: { schedule: true, actionLogs: { orderBy: { time: 'asc' } } }
            });
            if (!log) throw new Error("Log not found");
            title = log.schedule.title;
            notes = log.actionLogs.map(al => al.note || "").filter(Boolean);
            
            const [sh, sm] = log.schedule.startTime.split(":").map(Number);
            const [eh, em] = log.schedule.endTime.split(":").map(Number);
            const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
            duration = `${totalMinutes} นาที`;
        } else {
            const log = await prisma.freeStudyLog.findUnique({
                where: { id: logId },
                include: { actionLogs: { orderBy: { time: 'asc' } } }
            });
            if (!log) throw new Error("Log not found");
            title = log.title;
            notes = log.actionLogs.map(al => al.note || "").filter(Boolean);

            if (log.startedAt && log.endedAt) {
                const totalMinutes = dayjs(log.endedAt).diff(dayjs(log.startedAt), 'minute');
                duration = `${totalMinutes} นาที`;
            }
        }

        let summary = "";

        // --- GEMINI AI INTEGRATION ---
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
                
                const prompt = `
คุณคือ AI ติวเตอร์ส่วนตัวระดับอัจฉริยะ (999% IQ) หน้าที่ของคุณคือวิเคราะห์ข้อมูลการเรียนและให้คำแนะนำขั้นสุดยอด
ข้อมูลการเรียน:
- วิชา/หัวข้อ: "${title}"
- ระยะเวลาเรียน: ${duration}
- ประเภท: ${type === 'SCHEDULED' ? 'ในตารางเรียนปกติ' : 'นอกตารางเรียน (อ่านเอง)'}

บันทึกที่นักเรียนจดไว้ระหว่างเรียน:
${notes.length > 0 ? notes.map(n => `- ${n}`).join("\n") : "ไม่มีการจดบันทึก"}

กรุณาวิเคราะห์และสร้างบทสรุป (ใช้ภาษาไทยที่เป็นธรรมชาติ สร้างแรงบันดาลใจ และอ่านง่าย จัด Format ให้น่าอ่าน):
1. 📝 สรุปแก่นสำคัญ: วันนี้เรียนเรื่องอะไรไปบ้าง (วิเคราะห์เจาะลึกจากโน้ตและชื่อวิชา)
2. 💡 Highlight: ดึงประเด็นสำคัญที่สุด 2-3 ข้อที่ต้องจำให้ได้
3. 🎯 คำแนะนำระดับเซียน (Pro Tips): ให้คำแนะนำสุดยอดเกี่ยวกับการทบทวน หรือเทคนิคการเรียนที่เข้ากับเนื้อหานี้เป๊ะๆ (เช่น วิเคราะห์จุดอ่อนจากสิ่งที่จด แนะนำวิธีจำที่ไวขึ้น หรือการเชื่อมโยงความรู้)
                `;
                
                const result = await model.generateContent(prompt);
                summary = result.response.text();
            } catch (aiError) {
                console.error("Gemini API Error:", aiError);
                summary = "❌ เกิดข้อผิดพลาดในการเรียกใช้ AI (โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือความถูกต้องของ API Key ใน .env)";
            }
        }

        // --- Context-Aware Heuristic (Fallback) ---
        if (!summary || summary.startsWith("❌")) {
            const isError = summary.startsWith("❌");
            const combinedNotes = notes.join(" ").toLowerCase();
            const detectedTopics: string[] = [];
            const keywords: Record<string, string[]> = {
                "โจทย์และแบบฝึกหัด": ["โจทย์", "แบบฝึกหัด", "ทำข้อสอบ", "quiz", "test", "practice", "ข้อสอบ"],
                "เนื้อหาบทเรียน": ["สรุป", "อ่าน", "บทที่", "chapter", "theory", "ทฤษฎี", "เนื้อหา"],
                "การจำและเทคนิค": ["จด", "จำ", "flashcard", "mnemonic", "เทคนิค", "สูตร"],
                "จุดที่ยังสับสน": ["งง", "ไม่เข้าใจ", "ยาก", "ติด", "confused", "hard", "ลืม"]
            };

            Object.entries(keywords).forEach(([topic, words]) => {
                if (words.some(w => combinedNotes.includes(w))) {
                    detectedTopics.push(topic);
                }
            });

            let fallbackSummary = `จากการเรียนวิชา "${title}" ในเซสชันนี้ `;
            
            if (notes.length === 0) {
                fallbackSummary += `คุณไม่ได้จดบันทึกไว้ แต่ระบบตรวจพบว่าเป็นการเรียน${type === 'SCHEDULED' ? 'ตามตารางปกติ' : 'นอกตาราง'} ขอแนะนำให้เพิ่มการจดบันทึกเพื่อประสิทธิภาพในการทบทวนครับ`;
            } else {
                fallbackSummary += `พบว่าคุณเน้นไปที่ ${detectedTopics.length > 0 ? detectedTopics.join(" และ ") : "การจดบันทึกรายละเอียดของเนื้อหา"}\n\n`;
                fallbackSummary += `💡 สาระสำคัญที่คุณจดไว้:\n${notes.slice(0, 3).map(n => `• ${n}`).join("\n")}\n\n`;
                
                if (combinedNotes.includes("โจทย์") || combinedNotes.includes("ข้อสอบ")) {
                    fallbackSummary += `🎯 ข้อแนะนำ: คุณกำลังเน้นการฝึกทำโจทย์ ควรกลับมาทบทวนข้อที่ทำผิดภายใน 24 ชม. และลองหาโจทย์แนวเดียวกันมาทำซ้ำครับ`;
                } else if (combinedNotes.includes("จำ") || combinedNotes.includes("สูตร")) {
                    fallbackSummary += `🎯 ข้อแนะนำ: มีการใช้เทคนิคการจำหรือจดสูตร แนะนำให้ลองปิดสมุดแล้วเขียนออกมาดูว่ายังจำได้ครบถ้วนหรือไม่ (Active Recall)`;
                } else {
                    fallbackSummary += `🎯 ข้อแนะนำ: ลองสรุปเนื้อหาที่เรียนวันนี้ให้เหลือเพียง 3 ประโยคสั้นๆ เพื่อทดสอบว่าคุณเข้าใจแก่นของบทเรียนจริงๆ หรือไม่ครับ`;
                }
            }

            if (isError) {
                summary = `${summary}\n\n--- สรุปชั่วคราวโดยระบบ ---\n${fallbackSummary}`;
            } else {
                summary = fallbackSummary;
                if (!apiKey) {
                    summary += `\n\n*(หมายเหตุ: เพิ่ม GEMINI_API_KEY ในไฟล์ .env เพื่อปลดล็อก AI ระดับ 999%)*`;
                }
            }
        }

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
