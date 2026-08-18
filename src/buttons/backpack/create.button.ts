import { ButtonInteraction, EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import { CREATE_BACKPACK_EMBED_CUSTOM_IDS } from "../../embed/bacpack/create_backpack.embed";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { botAssetsEmojis } from "../../utils/emojis/emojis";
import { create_backpack } from "../../utils/backpack/create/create.helper";

const COOLDOWN_MS = 5_000;
const pending_users = new Set<string>();

export default {
    customId: CREATE_BACKPACK_EMBED_CUSTOM_IDS.create,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) {
            log.button.warn(
                metaBuilder(interaction.member as GuildMember, { button: "create-backpack" }),
                "create-backpack button used outside a cached guild context"
            );
            await interaction
                .reply({ content: "Эта кнопка недоступна здесь.", flags: MessageFlags.Ephemeral })
                .catch(() => {
                    // interaction may already be unusable at this point; nothing more to do
                });
            return;
        }

        const meta = metaBuilder(interaction.member, { button: "create-backpack" });
        const userId = interaction.member.id;

        if (pending_users.has(userId)) {
            log.button.info(meta, "Ignored duplicate create-backpack click while one is in flight");
            await interaction
                .reply({ content: "Уже обрабатываю ваш запрос, подождите.", flags: MessageFlags.Ephemeral })
                .catch(() => { });
            return;
        }

        pending_users.add(userId);

        try {
            log.button.info(meta, "Create backpack button triggered");

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const result = await create_backpack({ member: interaction.member });

            log.button.info({ ...meta, status: result.message }, "Backpack channel resolved");

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`${botAssetsEmojis.dot} ${result.message}`)
                        .setColor(result.status === "created" ? "Green" : "Yellow"),
                ],
            });
        } catch (error) {
            log.button.error(meta, "Failed to create backpack channel", error);
            await safeReply(interaction, error, "backpack_create_button.execute", interaction.id);
        } finally {
            pending_users.delete(userId);
            setTimeout(() => pending_users.delete(userId), COOLDOWN_MS).unref?.();
        }
    },
} satisfies Button;