import { AnySelectMenuInteraction, MessageFlags } from "discord.js";
import { getVacationDraft } from "../../../utils/vacation/draft_store";
import { requireManageGuild } from "../../../utils/permissions/requireManageGuild";


export async function passesVacationDraftOwnerGuard(interaction: AnySelectMenuInteraction): Promise<boolean> {
    if (!interaction.inCachedGuild()) return false;
    if (!(await requireManageGuild(interaction))) return false;

    const draft = getVacationDraft(interaction.message.id);
    if (draft.initiatedBy && draft.initiatedBy !== interaction.user.id) {
        await interaction.reply({
            content: "Эту настройку начал другой администратор. Попросите его завершить, либо начните заново.",
            flags: MessageFlags.Ephemeral,
        });
        return false;
    }

    return true;
}


export async function passesVacationSetupGuards(interaction: AnySelectMenuInteraction): Promise<boolean> {
    if (!(await passesVacationDraftOwnerGuard(interaction))) return false;

    const draft = getVacationDraft(interaction.message.id);
    if (draft.controlled === undefined) {
        await interaction.reply({
            content: "Сначала выберите тип отпуска.",
            flags: MessageFlags.Ephemeral,
        });
        return false;
    }

    return true;
}