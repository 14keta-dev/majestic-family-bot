import { Message } from "discord.js";
import { PrefixCommand } from "../../types";
import { requireManageGuildMessage } from "../../utils/permissions/requireManageGuild";
import { log } from "../../utils/logger";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig, updateConfig } from "../../utils/config/store";
import { afk_embed } from "../../embed/AFK/afk.embed";

export default {
    name: "afk",
    description: "resend afk message",
    async executePrefix(message: Message) {
        if (!message.guild || !message.member) return;

        if (!(await requireManageGuildMessage(message as Message<true>))) return;

        const meta = metaBuilder(message.member, { prefix: "afk" });

        try {
            log.command.info(meta, "afk prefix command triggered");

            const current_channel = await message.guild.channels.fetch(message.channelId).catch(() => null);
            if (!current_channel?.isTextBased()) return;

            const config = getConfig();

            if (config.AFK.panel_message && config.AFK.panel_channel) {
                try {
                    const oldChannel = await message.guild.channels
                        .fetch(config.AFK.panel_channel)
                        .catch(() => null);
                    if (oldChannel?.isTextBased()) {
                        const oldMessage = await oldChannel.messages
                            .fetch(config.AFK.panel_message)
                            .catch(() => null);
                        if (oldMessage) await oldMessage.delete().catch(() => null);
                    }
                } catch (error) {
                    log.command.error(meta, `Could not delete old AFK message error:${error}`);
                }
            }

            let new_afk_message: Message;

            try {
                const { row, embed } = afk_embed();

                new_afk_message = await current_channel.send({
                    embeds: [embed],
                    components: [row]
                });
            } catch (error) {
                log.command.error(meta, `Failed to send new afk message error:${error}`);
                await message.reply("Не удалось отправить сообщение заявки.").catch(() => null);
                return;
            }

            await updateConfig({
                AFK: {
                    panel_channel: current_channel.id,
                    panel_message: new_afk_message.id
                }
            });

            log.command.info(meta, `AFK message resent in channel ${current_channel.id}, new message id ${new_afk_message.id}`);
            await message.react("✅").catch(() => null);

            setTimeout(async () => {
                await message.delete().catch((error) => {
                    log.command.error(meta, `Could not delete afk command message error:${error}`);
                });
            }, 3_000);
        } catch (error) {
            log.command.error(meta, `Unhandled error in afk command error:${error}`);
        }
    },
} satisfies PrefixCommand;