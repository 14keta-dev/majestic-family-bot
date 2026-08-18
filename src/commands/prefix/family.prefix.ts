import { Message } from "discord.js";
import { PrefixCommand } from "../../types";
import { requireManageGuildMessage } from "../../utils/permissions/requireManageGuild";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig, updateConfig } from "../../utils/config/store";
import { log } from "../../utils/logger";

const DELETE_AFTER_MS = 3_000;

function deleteAfter(message: Message, ms: number = DELETE_AFTER_MS): void {
    setTimeout(() => {
        message.delete().catch(() => {
        });
    }, ms);
}

export default {
    name: "family",
    description: "Set family role",
    async executePrefix(message: Message) {
        if (!message.guild || !message.member) return;

        if (!(await requireManageGuildMessage(message as Message<true>))) return;

        const meta = metaBuilder(message.member, { prefix: "family" });

        deleteAfter(message);

        const mentionedRoles = message.mentions.roles;

        if (mentionedRoles.size === 0) {
            const reply = await message.reply("Укажи роль — затэгай её в сообщении. Пример: `!family @Семья`");
            deleteAfter(reply);
            return;
        }

        if (mentionedRoles.size > 1) {
            const reply = await message.reply("Можно указать только одну роль за раз.");
            deleteAfter(reply);
            return;
        }

        const role = mentionedRoles.first()!;
        const config = getConfig();


        try {
            await updateConfig({
                ...config,
                family_role: role.id
            });

            const reply = await message.reply(`Роль семьи установлена: ${role}`);
            deleteAfter(reply);
        } catch (error) {
            log.command.error(meta, "Failed to set family role");
            const reply = await message.reply("Не удалось сохранить роль. Попробуй ещё раз.");
            deleteAfter(reply);
        }
    }
} satisfies PrefixCommand;