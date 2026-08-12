import { AnySelectMenuInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { APPLY_SELECT_MENU_ID } from "../../embed/family_applications/apply.embed";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig } from "../../utils/config/store";
import { log } from "../../utils/logger";
import { buildApplyModal } from "../../utils/family_applications/buildApplyModal";
import { can_apply_to_family } from "../../utils/family_applications/can_apply";
import { SelectMenu } from "../../types";
import { safeReply } from "../../utils/safeReply.helper";
import { APPLY_FIELDS, getApplyType } from "../../utils/config/family_applications/applyFieldPresets";
import { resetSelectMenu } from "../../utils/resetSelet.helper";

const DUMMY_OPTION_VALUE = "dummy_input";

function errorEmbed(description: string): EmbedBuilder {
    return new EmbedBuilder().setTitle("—・Ошибка").setColor(0xed4245).setDescription(`> ${description}`);
}

export default {
    customId: APPLY_SELECT_MENU_ID,
    async execute(interaction: AnySelectMenuInteraction) {
        if (!interaction.isStringSelectMenu()) return;
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, { select: "family_applications_apply" });

        try {
            const selected = interaction.values[0];
            if (selected === DUMMY_OPTION_VALUE) return;

            const config = getConfig().family_applications;

            if (!config.active) {
                await interaction.reply({
                    embeds: [errorEmbed("Набор сейчас закрыт.")],
                    flags: MessageFlags.Ephemeral,
                });
                resetSelectMenu(interaction);
                return;
            }

            const applyType = getApplyType(selected);
            if (!applyType) {

                log.select.error(meta, `Selected apply type "${selected}" no longer exists`);
                await interaction.reply({
                    embeds: [errorEmbed("Этот тип заявки больше недоступен. Обновите сообщение и попробуйте снова.")],
                    flags: MessageFlags.Ephemeral,
                });
                resetSelectMenu(interaction);
                return;
            }

            const eligibility = await can_apply_to_family(interaction.member);
            if (!eligibility.status) {
                await interaction.reply({
                    embeds: [errorEmbed(eligibility.message ?? "Вы не можете подать заявку сейчас.")],
                    flags: MessageFlags.Ephemeral,
                });
                resetSelectMenu(interaction);
                return;
            }

            const modal = buildApplyModal(applyType, APPLY_FIELDS);
            await interaction.showModal(modal);
            resetSelectMenu(interaction);
            log.select.info(meta, `Showed apply modal for type "${applyType.id}"`);

        } catch (error) {
            log.select.error(meta, "Failed to show apply modal");
            await safeReply(interaction, error, "family_applications_apply.execute", interaction.id);
        }
    },
} satisfies SelectMenu;