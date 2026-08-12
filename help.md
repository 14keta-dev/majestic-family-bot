# family-2.0 — AI Assistant Guide

Discord bot (discord.js v14) built around a strict registry pattern. Read this before adding code.

## Core rule: single source of truth, generated/derived from it

Every "list of things" (servers, emojis, banners, buttons) has **one array/object as the source of truth**, and everything else (types, registries, lookups) is derived from it. Never hand-write a second copy of the same data.

Examples: `SERVER_COMPONENTS` in `server_components.ts` → types + `servers` registry derive from it. `BANNER_COMPONENTS` in `banner/banner.ts` → `BANNER_PATHS` derives from it. `BotCustomId` → button embeds derive their button lists from it via `flattenButtons()`.

## BotCustomId — critical structural rule

`src/utils/customIds.helper.ts` holds every button's `{ label, customId, active }`.

**Never nest one menu's button group inside another menu's group.** Each screen/menu gets its own top-level key. Nesting causes `flattenButtons()` to recurse into the wrong subtree and leak buttons from submenu A onto menu B (this has happened repeatedly — always double check when adding a new group).

```typescript
export const BotCustomId = {
    menuSlashCommand: { /* buttons for /menu */ },
    manageFamilyApplications: { /* buttons for the manage panel ONLY */ },
    createFamilyApplications: { /* buttons for the create submenu ONLY, NOT nested under manageFamilyApplications */ },
    embedTypeSelect: { /* its own screen, its own handler */ },
} as const;
```

Use `flattenButtons(node)` (not `Object.values`) to build button lists from any group — it's null-safe against future nesting, but the flat-groups rule above still matters for correctness of *which* buttons appear where.

**`customId` strings have a 100-char hard limit** (Discord API). Keep them short; check length when adding new ones.

## Banners (`src/utils/config/banner/`)

- Source of truth: `BANNER_COMPONENTS` array (`{ key, text }`) + shared `BANNER_ACCENT`.
- Generate/regenerate: `pnpm generate-banner` (only builds new/changed, tracked via `.manifest.json` hash). `pnpm generate-banner <key>` or `--all` forces a rebuild.
- Access at runtime via `botAssets.banner.<key>` → `{ path, name, url, toAttachment() }`.

**Golden rule:** any component using `botAssets.banner.<key>.url` (via `MediaGalleryItemBuilder` or `embed.setImage`) MUST be paired with `files: [botAssets.banner.<key>.toAttachment()]` in the `reply`/`editReply`/`followUp` call that sends it — otherwise Discord throws `UNFURLED_MEDIA_ITEM_REFERENCED_ATTACHMENT_NOT_FOUND`. If an embed doesn't reference a banner, don't attach one either (wasted upload, but harmless).

Currently **only `create_family_applications_menu_embed` shows a banner** — don't add banners to other menus unless asked.

## Emojis (`src/utils/config/emojis.ts`)

- `botEmojis` — server-code-keyed set (`at`, `bs`, `ch`...), selected per `BOT_ID` via `registry`.
- `botAssetEmojis` — free-form named icon emojis (`dot`, etc.), NOT bot-variant-specific, always available.
- Regenerate both via `pnpm deploy-emojis` (uploads files under `emojis/<folder>/` and rewrites the generated block in this file). `--dry-run` to preview.

## Components V2 vs legacy embeds — DO NOT MIX

`MessageFlags.IsComponentsV2` + `ContainerBuilder`/`TextDisplayBuilder`/`MediaGalleryBuilder` is one message format. Classic `EmbedBuilder` + `embeds:`/`components:` (ActionRow of buttons/selects) is a different, incompatible format.

- **Cannot mix them in one message.**
- **A message's V2 flag is permanent** — once sent with `IsComponentsV2`, no later `editReply` can turn it back into a legacy-embed message. If a flow needs to switch from V2 to legacy (or vice versa) partway through, send a **new** message via `interaction.followUp(...)` instead of editing the existing one.

All menu/submenu screens in this bot use V2 (`ContainerBuilder`). The "default embed type" apply-template flow uses legacy embeds — that's why it uses `followUp`, not `editReply`.

## Button/command handler pattern

Every handler follows this shape:

```typescript
export default {
    customId: BotCustomId.<group>.<button>.customId,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;
        const meta = metaBuilder(interaction.member as GuildMember, { button: interaction.customId });

        try {
            await interaction.deferUpdate({});
        } catch (error) {
            log.button.error(meta, "Could not defer reply in time");
            await safeReply(interaction, error, "menu:defer", interaction.id);
            return;
        }

        try {
            // ... editReply or followUp with the next screen's components
        } catch (error) {
            log.command.error(meta, "Failed to send X");
            await safeReply(interaction, error, "menu:send", interaction.id);
        }
    },
} satisfies Button;
```

- Button clicks that continue an existing ephemeral flow: `deferUpdate()` then `editReply()`. **Never `deferUpdate()` + `.reply()`** — throws `InteractionAlreadyReplied`.
- Slash commands starting a new ephemeral flow: `deferReply({ flags: MessageFlags.Ephemeral })` then `editReply()`.
- Switching message format mid-flow (V2 ↔ legacy): `deferUpdate()` then `followUp()` (new message, not editing the old one).

## Build/run

`pnpm prod` = `pnpm build && pnpm start` (tsup → dist/, then `node dist/index.js`). Loaders in `src/loaders/` walk compiled `dist/` folders and `require()` each file's `.default` export — a file with no `export default` (or the wrong default shape) causes a `Cannot read properties of undefined` crash at startup. If that happens, check `walk.helper.ts` output isn't picking up stray non-command files, and that every command/button file actually has `export default { ... } satisfies <Type>`.