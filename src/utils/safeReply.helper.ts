import { Interaction } from 'discord.js';
import { sendErrorWebhook } from './logger/webhook';

export async function safeReply(interaction: Interaction, err: unknown, label: string, id: string) {
    console.error(`❌ ${label} error [${id}]:`, err);

    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    sendErrorWebhook({
        level: 'ERROR',
        message: `**${label}**\n${message}`,
        meta: { id },
    }).catch(() => {
    });

    if (!interaction.isRepliable()) return;

    try {
        if (interaction.deferred) {
            await interaction.editReply({ content: 'Произошла ошибка попробуйте через пару секунд.' });
        } else if (interaction.replied) {
            await interaction.followUp({ content: 'Произошла ошибка попробуйте через пару секунд.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Произошла ошибка попробуйте через пару секунд.', ephemeral: true });
        }
    } catch {
        // interaction expired or Discord API error — nothing we can do
    }
}