import { ServerCode } from ".";

export type BaseEmojiSet = Record<ServerCode, string>;

// === AUTO-GENERATED START ===

export type AssetsEmojiKey = keyof typeof assetsEmojis;
export type AssetsEmojiSet = Record<AssetsEmojiKey, string>;

export type ServersEmojiKey = keyof typeof serversEmojis;
export type ServersEmojiSet = Record<ServersEmojiKey, string>;

export type TempVoiceEmojiKey = keyof typeof tempVoiceEmojis;
export type TempVoiceEmojiSet = Record<TempVoiceEmojiKey, string>;

const registry = {
    servers: serversEmojis,
};

export const botAssetsEmojis: AssetsEmojiSet = assetsEmojis;
export const botTempVoiceEmojis: TempVoiceEmojiSet = tempVoiceEmojis;
// === AUTO-GENERATED END ===

type BotId = keyof typeof registry;

function resolveActiveBot(): BotId {
    const configured = process.env.BOT_ID as BotId | undefined;
    if (configured && configured in registry) return configured;
    const fallback = Object.keys(registry)[0] as BotId;
    if (configured) {
        console.warn(`Unknown BOT_ID "${configured}", falling back to "${fallback}".`);
    }
    return fallback;
}

export const botEmojis: BaseEmojiSet = registry[resolveActiveBot()] as unknown as BaseEmojiSet;