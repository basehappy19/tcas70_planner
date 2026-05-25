'use server'

import { google } from 'googleapis';
import { Readable } from 'stream';

export async function uploadImageToDrive(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) throw new Error("No file uploaded");

        const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
        if (!ALLOWED_TYPES.includes(file.type)) {
            return { success: false, error: `ไม่รองรับไฟล์ประเภท ${file.type}` };
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        const fileMetadata = {
            name: `${Date.now()}-${file.name}`,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: { mimeType: file.type, body: stream },
            fields: 'id',
        });

        const fileId = response.data.id!;

        await drive.permissions.create({
            fileId,
            requestBody: { role: 'reader', type: 'anyone' },
        });

        const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;

        return { success: true, url: directUrl, webViewLink, fileId };

    } catch (error) {
        console.error("Error uploading to drive:", error);
        return { success: false, error: "Failed to upload image" };
    }
}