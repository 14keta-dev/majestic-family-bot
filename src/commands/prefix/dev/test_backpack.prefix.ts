import { Message, TextChannel, GuildMember, Guild } from "discord.js";
import { PrefixCommand } from "../../../types";
import { create_backpack } from "../../../utils/backpack/create/create.helper";
import { env } from "../../../utils/env";

const STRESS_COUNT = 200;

const DISCORD_EPOCH = 1_420_070_400_000n;


function random_snowflake(): string {
    const timestampPart = BigInt(Date.now()) - DISCORD_EPOCH;
    const randomBits = BigInt(Math.floor(Math.random() * 0x3f_ffff));

    const snowflake = (timestampPart << 22n) | randomBits;

    return snowflake.toString();
}

function make_fake_member(guild: Guild, index: number): GuildMember {
    const id = random_snowflake();
    return {
        id,
        guild,
        displayName: `StressUser${index}`,
        user: { id, bot: false, tag: `StressUser${index}#0000` },
    } as unknown as GuildMember;
}

export default {
    name: "test_backpack",
    description: "stress test backpack creation with 200 concurrent fake-id calls",
    async executePrefix(message: Message) {
        if (env.NODE_ENV !== "development" || message.author.id !== env.DEVELOPER || !message.guild) {
            return;
        };


        if (!message.member?.permissions.has("ManageGuild")) {
            await message.reply("Недостаточно прав.");
            return;
        }

        const status = await message.reply(`Генерирую ${STRESS_COUNT} случайных ID для стресс-теста...`);

        const guild = message.guild;
        const targets = Array.from({ length: STRESS_COUNT }, (_, i) => make_fake_member(guild, i));

        const start = Date.now();

        const results = await Promise.allSettled(
            targets.map((member) => create_backpack({ member }))
        );

        const elapsedMs = Date.now() - start;

        let created = 0;
        let alreadyHad = 0;
        let misconfigured = 0;
        let failed = 0;
        const errorLines: string[] = [];

        results.forEach((result, i) => {
            const member = targets[i];

            if (result.status === "rejected") {
                failed++;
                errorLines.push(`[${member.id}] ${member.displayName}: ${String(result.reason?.message ?? result.reason)}`);
                return;
            }

            const { message: msg } = result.value;

            if (msg.startsWith("Канал создан")) {
                created++;
            } else if (msg.includes("уже есть")) {
                alreadyHad++;
            } else if (msg.includes("не настроена")) {
                misconfigured++;
            } else {
                errorLines.push(`[${member.id}] ${member.displayName}: unexpected message "${msg}"`);
            }
        });

        const summary = [
            `**Стресс-тест бэкпаков завершён (случайные ID)**`,
            `Всего вызовов: ${targets.length}`,
            `⏱ Время: ${elapsedMs}ms (${(elapsedMs / targets.length).toFixed(1)}ms/вызов)`,
            `✅ Создано: ${created}`,
            `♻️ Уже был канал: ${alreadyHad}`,
            `⚙️ Не настроено: ${misconfigured}`,
            `❌ Ошибок: ${failed}`,
        ].join("\n");

        await status.edit(summary);

        if (errorLines.length > 0) {
            const channel = message.channel as TextChannel;
            const buffer = Buffer.from(errorLines.join("\n"), "utf-8");
            await channel.send({
                content: `Детали ошибок (${errorLines.length}):`,
                files: [{ attachment: buffer, name: "stress_test_errors.txt" }],
            });
        }
    },
} satisfies PrefixCommand;