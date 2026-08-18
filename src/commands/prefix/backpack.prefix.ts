import { Message, MessageFlags } from "discord.js";
import { PrefixCommand } from "../../types";
import { requireManageGuildMessage } from "../../utils/permissions/requireManageGuild";
import { log } from "../../utils/logger";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig, updateConfig } from "../../utils/config/store";
import { afk_embed } from "../../embed/AFK/afk.embed";
import { create_backpack_embed } from "../../embed/bacpack/create_backpack.embed";

export default {
    name: "bacpack",
    description: "resend bacpack message",
    async executePrefix(message: Message) {
        if (!message.guild || !message.member) return;

        if (!(await requireManageGuildMessage(message as Message<true>))) return;

        const meta = metaBuilder(message.member, { prefix: "bacpack" });

        try {
            log.command.info(meta, "bacpack prefix command triggered");

            const current_channel = await message.guild.channels.fetch(message.channelId).catch(() => null);
            if (!current_channel?.isTextBased()) return;

            const config = getConfig();

            if (config.backpack.panel_message && config.backpack.panel_channel) {
                try {
                    const oldChannel = await message.guild.channels
                        .fetch(config.backpack.panel_channel)
                        .catch(() => null);
                    if (oldChannel?.isTextBased()) {
                        const oldMessage = await oldChannel.messages
                            .fetch(config.backpack.panel_message)
                            .catch(() => null);
                        if (oldMessage) await oldMessage.delete().catch(() => null);
                    }
                } catch (error) {
                    log.command.error(meta, `Could not delete old backpack message error:${error}`);
                }
            }

            let new_backpack_message: Message;

            try {
                new_backpack_message = await current_channel.send({
                    components: create_backpack_embed(),
                    flags: MessageFlags.IsComponentsV2
                })
            } catch (error) {
                log.command.error(meta, `Failed to send new bacpack message error:${error}`);
                await message.reply("Не удалось отправить сообщение заявки.").catch(() => null);
                return;
            }

            await updateConfig({
                backpack: {
                    panel_channel: current_channel.id,
                    panel_message: new_backpack_message.id
                }
            });

            log.command.info(meta, `backpack message resent in channel ${current_channel.id}, new message id ${new_backpack_message.id}`);
            await message.react("✅").catch(() => null);

            setTimeout(async () => {
                await message.delete().catch((error) => {
                    log.command.error(meta, `Could not delete bacpack command message error:${error}`);
                });
            }, 3_000);
        } catch (error) {
            log.command.error(meta, `Unhandled error in bacpack command error:${error}`);
        }
    },
} satisfies PrefixCommand;