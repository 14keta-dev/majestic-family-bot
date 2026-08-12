
import { ServerCode } from ".";

export type BaseEmojiSet = Record<ServerCode, string>;
export type AssetEmojiSet = Record<string, string>;

// === AUTO-GENERATED START ===
const assetsEmojis: AssetEmojiSet = {
    active: "<a:active:1536867341164478594>",
    closed: "<a:closed:1536867344058421338>",
    dot: "<a:dot:1536134273235554334>",
};

const serversEmojis: BaseEmojiSet = {
    at: "<:at:1536101442312470558>",
    bs: "<:bs:1536101444673867897>",
    ch: "<:ch:1536101446955573310>",
    dl: "<:dl:1536101449350647811>",
    dn: "<:dn:1536101452450107422>",
    dt: "<:dt:1536101455545630751>",
    hs: "<:hs:1536101458431189092>",
    la: "<:la:1536101460625072151>",
    lv: "<:lv:1536101463418347612>",
    mcl: "<:mcl:1536101466010419350>",
    mi: "<:mi:1536101468111773787>",
    mp: "<:mp:1536101470569762847>",
    ny: "<:ny:1536101473505513482>",
    or: "<:or:1536101475657318511>",
    pn: "<:pn:1536101478241013830>",
    pt: "<:pt:1536101480346689549>",
    sd: "<:sd:1536101483190292582>",
    sf: "<:sf:1536101486642073714>",
    st: "<:st:1536101489062318260>",
    wa: "<:wa:1536101491436294156>",
};

const registry = {
    servers: serversEmojis,
};
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

export const botEmojis: BaseEmojiSet = registry[resolveActiveBot()];

/** Always-available named icon/asset emojis — same across every bot variant. */
export const botAssetEmojis: AssetEmojiSet = assetsEmojis;