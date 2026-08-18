import { Message, ChannelType, DiscordAPIError } from "discord.js";
import { PrefixCommand } from "../../../types";
import { backpack_store } from "../../../utils/backpack/backpack.schema";
import { env } from "../../../utils/env";

export default {
    name: "delete_backpack",
    description: "удалить все каналы бэкпаков (discord + бд)",
    async executePrefix(message: Message) {
        if (env.NODE_ENV !== "development" || message.author.id !== env.DEVELOPER) {
            return;
        }

        const channels = backpack_store.get_all_channels();

        if (channels.length === 0) {
            await message.reply("Каналы бэкпаков в базе данных не найдены.");
            return;
        }

        const status = await message.reply(
            `Найдено ${channels.length} канал(ов). Начинаю удаление...`
        );

        let deleted = 0;
        let missingInDiscord = 0;
        let failed = 0;

        for (const channel of channels) {
            try {
                const discordChannel = await message.guild?.channels
                    .fetch(channel.id)
                    .catch(() => null);

                if (discordChannel) {
                    await discordChannel.delete("Массовая очистка каналов бэкпаков");
                } else {
                    missingInDiscord++;
                }

                await backpack_store.remove_channel(channel.id);
                deleted++;
            } catch (err) {
                if (err instanceof DiscordAPIError && err.code === 10003) {
                    await backpack_store.remove_channel(channel.id);
                    missingInDiscord++;
                    deleted++;
                } else {
                    failed++;
                    console.error(`Не удалось удалить канал ${channel.id}:`, err);
                }
            }
        }

        const categories = backpack_store.get_all_categories();
        for (const category of categories) {
            if (category.channels.length === 0) {
                const discordCategory = await message.guild?.channels
                    .fetch(category.id)
                    .catch(() => null);

                if (discordCategory) {
                    await discordCategory.delete("Массовая очистка бэкпаков — пустая категория").catch(() => null);
                }

                await backpack_store.remove_category(category.id);
            }
        }

        await status.edit(
            `Готово. Удалено: ${deleted} (из них ${missingInDiscord} уже отсутствовали в discord). Ошибок: ${failed}.`
        );
    },
} satisfies PrefixCommand;