import { EmbedBuilder, GuildMember, MessageFlags, StringSelectMenuInteraction } from "discord.js";
import { BACKPACK_CHANNEL_EMBED_CUSTOM_IDS } from "../../embed/bacpack/channe.embed";
import { StringSelectMenu } from "../../types";
import { can_manage_backpack } from "../../utils/backpack/can_manage";
import { metaBuilder } from "../../utils/logger/met_builder";
import { botAssetsEmojis } from "../../utils/emojis/emojis";
import { log } from "../../utils/logger";
import { delete_backpack } from "../../utils/backpack/delete_backpack.helper";

export default {
    customId: BACKPACK_CHANNEL_EMBED_CUSTOM_IDS.select,
    async execute(interaction: StringSelectMenuInteraction) {
        if (!interaction.guild || !interaction.member) return;

        const can_manage = await can_manage_backpack({ member: interaction.member as GuildMember });

        if (!can_manage) {
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle(`${botAssetsEmojis.dot} Ошибка`).setDescription("> Недостаточно прав для этого действия")],
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const meta = metaBuilder(interaction.member as GuildMember, { select: "manage-backpack" });

        const [action, ownerId] = interaction.values[0].split(":");

        try {
            log.select.info(meta, "Manage backpack menu triggered");

            switch (action) {
                case BACKPACK_CHANNEL_EMBED_CUSTOM_IDS.delete: {
                    const channel = interaction.channel;

                    if (!channel || !("guild" in channel) || channel.isThread()) {
                        await interaction.reply({
                            embeds: [new EmbedBuilder().setTitle(`${botAssetsEmojis.dot} Ошибка`).setDescription("> Не удалось определить канал")],
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    }

                    await delete_backpack({ channel, client: interaction.client });
                    break;
                }

                default: {
                    log.select.warn(meta, `Unhandled backpack select action: ${action}`);
                    await interaction.reply({
                        embeds: [new EmbedBuilder().setTitle(`${botAssetsEmojis.dot} Ошибка`).setDescription("> Неизвестное действие")],
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        } catch (error) {
            log.select.error(meta, "Failed to handle manage backpack menu", error);
        }
    }
} satisfies StringSelectMenu;