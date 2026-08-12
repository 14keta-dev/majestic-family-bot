import { Message, MessageFlags } from "discord.js";
import { PrefixCommand } from "../../types";
import { requireManageGuildMessage } from "../../utils/permissions/requireManageGuild";
import { log } from "../../utils/logger";
import { metaBuilder } from "../../utils/logger/met_builder";
import { buildApplyEmbed } from "../../embed/family_applications/apply.embed";
import { getConfig, updateConfig } from "../../utils/config/store";

export default {
    name: "famq",
    description: "resend apply message",
    async executePrefix(message: Message) {
        if (!message.guild || !message.member) return;

        if (!(await requireManageGuildMessage(message as Message<true>))) return;

        const meta = metaBuilder(message.member, { prefix: "famq" });

        try {
            log.command.info(meta, "Famq prefix command triggered");

            const current_channel = await message.guild.channels.fetch(message.channelId).catch(() => null);
            if (!current_channel?.isTextBased()) return;

            const config = getConfig();

            if (config.family_applications.apply_messageId && config.family_applications.channels.apply_channel) {
                try {
                    const oldChannel = await message.guild.channels
                        .fetch(config.family_applications.channels.apply_channel)
                        .catch(() => null);
                    if (oldChannel?.isTextBased()) {
                        const oldMessage = await oldChannel.messages
                            .fetch(config.family_applications.apply_messageId)
                            .catch(() => null);
                        if (oldMessage) await oldMessage.delete().catch(() => null);
                    }
                } catch (error) {
                    log.command.error(meta, `Could not delete old apply message error:${error}`);
                }
            }

            let new_apply_message: Message;

            try {
                new_apply_message = await current_channel.send({
                    components: buildApplyEmbed(config.family_applications),
                    flags: MessageFlags.IsComponentsV2,
                });
            } catch (error) {
                log.command.error(meta, `Failed to send new apply message error:${error}`);
                await message.reply("Не удалось отправить сообщение заявки.").catch(() => null);
                return;
            }

            updateConfig({
                family_applications: {
                    ...config.family_applications,
                    apply_messageId: new_apply_message.id,
                    channels: {
                        ...config.family_applications.channels,
                        apply_channel: current_channel.id,
                    },
                },
            });

            log.command.info(meta, `Apply message resent in channel ${current_channel.id}, new message id ${new_apply_message.id}`);
            await message.react("✅").catch(() => null);

            setTimeout(async () => {
                await message.delete().catch((error) => {
                    log.command.error(meta, `Could not delete famq command message error:${error}`);
                });
            }, 3_000);
        } catch (error) {
            log.command.error(meta, `Unhandled error in famq command error:${error}`);
        }
    },
} satisfies PrefixCommand;