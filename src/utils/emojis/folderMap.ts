

export interface FolderMapEntry {
    key: string;
    type: string;
    isBot: boolean;
}

export const FOLDER_MAP: Record<string, FolderMapEntry> = {
    assets: { key: "assets", type: "AssetEmojiSet", isBot: false },
    servers: { key: "servers", type: "BaseEmojiSet", isBot: true },
};