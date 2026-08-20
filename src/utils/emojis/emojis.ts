import { ServerCode } from ".";

export type BaseEmojiSet = Record<ServerCode, string>;

// === AUTO-GENERATED START ===
const assetsEmojis = {
    active: "<a:active:1536867341164478594>",
    afk: "<a:afk:1536994312020033536>",
    closed: "<a:closed:1536867344058421338>",
    dot: "<a:dot:1536134273235554334>",
    next: "<a:next:1537949059732480030>",
    prev: "<a:prev:1537949062802710548>",
    vacation: "<a:vacation:1537947849697009724>",
} as const;

const serversEmojis = {
    ar: "<:ar:1538641299056365609>",
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
    tv: "<:tv:1538641301581598763>",
    wa: "<:wa:1536101491436294156>",
} as const;

const tempVoiceEmojis = {
    add_user: "<:add_user:1538222704749056090>",
    bitrate: "<:bitrate:1538222707500515369>",
    change_leader: "<:change_leader:1538222709912113233>",
    change_limit: "<:change_limit:1538222712210587839>",
    change_name: "<:change_name:1538222715335344259>",
    exclude_user: "<:exclude_user:1538222718175019058>",
    give_user_acess: "<:give_user_acess:1538222720557256844>",
    mute_unmute: "<:mute_unmute:1538222723120242740>",
    open_close: "<:open_close:1538222725611393034>",
    remove_user: "<:remove_user:1538222728513986580>",
} as const;

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