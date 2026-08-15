export interface FolderMapEntry {
    key: string;
    isBot: boolean;
}

export const FOLDER_MAP: Record<string, FolderMapEntry> = {
    assets: { key: "assets", isBot: false },
    servers: { key: "servers", isBot: true },
    temp_voice: { key: "temp_voice", isBot: false },
};