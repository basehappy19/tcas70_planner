import dayjs from "@/lib/dayjs";

export function formatTime12(time: string | Date | dayjs.Dayjs) {
    if (!time) return "";
    const d = dayjs.isDayjs(time) ? time : dayjs(time, typeof time === 'string' && time.includes(':') ? "HH:mm" : undefined);
    return d.format("h:mm A");
}

export function formatDateThai(date: string | Date | dayjs.Dayjs, format = "D MMMM BBBB") {
    return dayjs(date).format(format);
}

export function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h} ชม.`);
    if (m > 0 || h > 0) parts.push(`${m} น.`);
    if (h === 0) parts.push(`${s} วิ`);
    
    return parts.join(" ");
}

export function formatDurationDigital(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const pad = (n: number) => String(n).padStart(2, "0");
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
}

export function getGoogleDriveImageUrl(url: string | null | undefined) {
    if (!url) return "";
    if (!url.includes("drive.google.com")) return url;
    
    // Convert preview/view links to direct thumbnail/content links for performance
    const match = url.match(/\/d\/(.*?)\//) || url.match(/id=(.*?)(&|$)/);
    const fileId = match ? (match[1] || match[0]) : null;
    
    if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
    }
    return url;
}
