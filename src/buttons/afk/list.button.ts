import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { AFK_EMBED_BUTTON_CUSTOM_IDS } from "../../embed/AFK/afk.embed";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { afk_store } from "../../utils/AFK/afk.schema";
import { botAssetsEmojis } from "../../utils/emojis/emojis";

const MAX_PER_EMBED = 10;

function toUnixSeconds(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

export default {
    customId: AFK_EMBED_BUTTON_CUSTOM_IDS.list,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, { button: "list-afk" });

        log.button.info(meta, "List afk button triggered");

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const active = afk_store
                .get_all_afk()
                .sort((a, b) => new Date(a.estimatedEndingAt).getTime() - new Date(b.estimatedEndingAt).getTime());

            if (active.length === 0) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`${botAssetsEmojis.dot} Список AFK`)
                            .setDescription("> Сейчас никто не находится в AFK")
                            .setColor("Green"),
                    ],
                });
                return;
            }

            const groups = chunk(active, MAX_PER_EMBED);

            const embeds = groups.map((group, index) => {
                const lines = group.map((entry) => {
                    const endingAt = new Date(entry.estimatedEndingAt);
                    const unix = toUnixSeconds(endingAt);
                    return `<@${entry.userId}> | до <t:${unix}:f> | <t:${unix}:R>`;
                });

                const embed = new EmbedBuilder()
                    .setDescription(`${lines.join("\n")}`)
                    .setColor("Green");

                if (index === 0) {
                    embed.setTitle(`${botAssetsEmojis.dot} Список AFK`);
                }

                return embed;
            });

            await interaction.editReply({ embeds });
        } catch (error) {
            log.button.error(meta, `Failed to list afk users error:${error}`);
            await safeReply(interaction, error, "afk_list_button.execute", interaction.id);
        }
    },
} satisfies Button;