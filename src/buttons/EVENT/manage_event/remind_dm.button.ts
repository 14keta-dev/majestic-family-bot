import { ButtonInteraction, GuildMember, MessageFlags } from "discord.js";
import { Button } from "../../../types";
import { log } from "../../../utils/logger";
import { REMIND_DM_BASE_URL, REMIND_DM_CUSTOM_IDS, remind_dm_embed } from "../../../embed/EVENT/manage_event/remind_dm.embed";
import { resolveManageableEvent } from "../../../utils/EVENT/resolveManageableEvent.helper";
import { remind_dm_both, remind_dm_main_list, remind_dm_replacement_list } from "../../../utils/EVENT/manage_event/remind_dm";

export default {
    customId: REMIND_DM_BASE_URL,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const parts = interaction.customId.split(":");
        const eventId = parts[parts.length - 1];
        const remindType = parts[parts.length - 2];

        if (!eventId || !remindType) {
            log.button.debug({}, `Could not parse event id or remind type from "${interaction.customId}"`);
            return;
        }

        const ctx = await resolveManageableEvent({
            interaction,
            eventId,
            member: interaction.member as GuildMember,
            logNamespace: "button",
            logSource: "event_remind_dm",
        });
        if (!ctx) return;

        const { event } = ctx;

  
        await interaction.update({
            components: remind_dm_embed({ event, disabled: true, status: "Отправка напоминаний..." }),
            flags: MessageFlags.IsComponentsV2
        });

        try {
            let result: { message: string } | undefined;

            switch (remindType) {
                case REMIND_DM_CUSTOM_IDS.main_list:
                    result = await remind_dm_main_list({ event, client: interaction.client });
                    break;
                case REMIND_DM_CUSTOM_IDS.replacement_list:
                    result = await remind_dm_replacement_list({ event, client: interaction.client });
                    break;
                case REMIND_DM_CUSTOM_IDS.both:
                    result = await remind_dm_both({ event, client: interaction.client });
                    break;
                default:
                    return;
            }

            await interaction.editReply({
                components: remind_dm_embed({ event, disabled: false, status: result?.message ?? "Готово" }),
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            log.button.error({}, `Error while reminding in dm: ${error}`);
            await interaction.editReply({
                components: remind_dm_embed({ event, disabled: false, status: "Произошла ошибка, попробуйте ещё раз" }),
                flags: MessageFlags.IsComponentsV2
            }).catch(() => undefined);
        }
    }
} satisfies Button;