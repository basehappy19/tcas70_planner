export interface Subject {
    id: number;
    name: string;
    fullScore?: number;
}

export interface ActionImage {
    id: number;
    url: string;
    caption: string | null;
}

export interface ActionLog {
    id: number;
    time: Date;
    action: string;
    note: string | null;
    images?: ActionImage[];
}

export interface LocalImage {
    id: string;
    file: File;
    preview: string;
    caption: string;
    status: "pending" | "uploading" | "done" | "error";
    driveUrl?: string;
}

export type Status = "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "IDLE";
