
import { ButtonInteraction, EmbedBuilder, GuildMember, InteractionReplyOptions, MessageFlags } from "discord.js";
import { Button } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { REMIND_THREAD_BASE_URL, REMIND_THRED_CUSTOM_IDS } from "../../../embed/EVENT/manage_event/remind_in_thread";
import { event_store } from "../../../utils/EVENT/event.schema";
import { remind_thread_both, remind_thread_main_list, remind_thread_replacement_list } from "../../../utils/EVENT/manage_event/remind_thread";

export default {
    customId: REMIND_THREAD_BASE_URL,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const meta = metaBuilder(interaction.member as GuildMember, { button: "event_remind_thred" });

        const parts = interaction.customId.split(":");
        const eventId = parts[parts.length - 1];
        const remindType = parts[parts.length - 2];

        if (!eventId || !remindType) {
            log.button.debug(meta, `Could not parse event id or remind type, when trying to remind in thread, ${eventId} ${remindType}`)
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Произошла ошибка попробуйте через пару секунд")],
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const event = event_store.get(eventId);

        if (!event) {
            log.button.debug(meta, `Could not fetch event when trying to remind in thread, ${eventId} ${remindType}`)
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Произошла ошибка попробуйте через пару секунд")],
                flags: MessageFlags.Ephemeral
            })
            return;
        }

        try {
            let result: { message: string } | undefined;

            switch (remindType) {
                case REMIND_THRED_CUSTOM_IDS.main_list: {
                    result = await remind_thread_main_list({ event, interaction });
                    break;
                }
                case REMIND_THRED_CUSTOM_IDS.replacement_list: {
                    result = await remind_thread_replacement_list({ event, interaction });
                    break;
                }
                case REMIND_THRED_CUSTOM_IDS.both: {
                    result = await remind_thread_both({ event, interaction });
                    break;
                }
                default: {
                    return;
                }
            }

            const reply = await interaction.reply({
                content: result?.message ?? "Готово",
                flags: MessageFlags.Ephemeral
            });

            setTimeout(async () => {
                try {
                    await reply.delete();
                } catch (err) {
                    log.button.warn(meta, `Failed to delete reminder reply: ${err}`);
                }
            }, 5000);

        } catch (error) {
            log.button.debug(meta, `Error while reminding in thread: ${error}`);

            const errorPayload: InteractionReplyOptions = {
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Произошла ошибка попробуйте через пару секунд")],
                flags: MessageFlags.Ephemeral
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorPayload);
            } else {
                await interaction.reply(errorPayload);
            }
        }
    }
} satisfies Button;