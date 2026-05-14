'use server'

import { google } from 'googleapis';
import { Readable } from 'stream';

export async function uploadImageToDrive(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) throw new Error("No file uploaded");

        // 1. ตั้งค่า Auth ด้วย OAuth2 แทน Service Account
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        // ใส่ Refresh Token เพื่อให้มันขอ Access Token ใหม่ได้เรื่อยๆ โดยที่เราไม่ต้อง Login ใหม่
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // 2. แปลงไฟล์
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        // 3. กำหนดข้อมูลการอัปโหลด
        const fileMetadata = {
            name: `${Date.now()}-${file.name}`,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
        };

        const media = {
            mimeType: file.type,
            body: stream,
        };

        // 4. สั่งอัปโหลด
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        await drive.permissions.create({
            fileId: response.data.id!,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        return { 
            success: true, 
            url: response.data.webViewLink, 
            fileId: response.data.id 
        };

    } catch (error) {
        console.error("Error uploading to drive:", error);
        return { success: false, error: "Failed to upload image" };
    }
}