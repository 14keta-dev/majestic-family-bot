
import { Events, Interaction } from 'discord.js';
import type { BotEvent } from '../../types';
import { buttons } from '../../loaders/button.loader';
import { modals } from '../../loaders/modal.loader';
import { selects } from '../../loaders/select.loader';
import { commands } from '../../loaders/slashCommand.loader';
import { safeReply } from '../../utils/safeReply.helper';
import { matchCustomId } from '../../utils/family_applications/match_custom_id';

export default {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction) {

        if (interaction.isChatInputCommand()) {
            const command = commands.get(interaction.commandName);
            if (!command) return;
            try {
                if (command.defer) await interaction.deferReply({ ephemeral: command.ephemeral });
                await command.execute(interaction);
            } catch (err) {
                await safeReply(interaction, err, 'Command', interaction.commandName);
            }
            return;
        }

        if (interaction.isAutocomplete()) {
            const command = commands.get(interaction.commandName);
            if (!command?.autocomplete) return;
            try {
                await command.autocomplete(interaction);
            } catch (err) {
                console.error(`❌ Autocomplete error [${interaction.commandName}]:`, err);
            }
            return;
        }

        if (interaction.isButton()) {
            const button = buttons.find(b =>
                typeof b.customId === 'string'
                    ? matchCustomId(interaction.customId, b.customId, { dynamic: b.dynamic })
                    : b.customId.test(interaction.customId)
            );
            if (!button) return;
            try {
                if (button.deferUpdate) {
                    await interaction.deferUpdate();
                } else if (button.defer || button.ephemeralDefer) {
                    await interaction.deferReply({ flags: button.ephemeralDefer ? 64 : undefined });
                }
                await button.execute(interaction);
            } catch (err) {
                await safeReply(interaction, err, 'Button', interaction.customId);
            }
            return;
        }

        if (interaction.isModalSubmit()) {
            console.log(interaction.customId)
            const modal = modals.find(m =>
                typeof m.customId === 'string'
                    ? matchCustomId(interaction.customId, m.customId, { dynamic: m.dynamic })
                    : m.customId.test(interaction.customId)
            );

            console.log(interaction.customId)
            if (!modal) return;
            try {
                if (modal.defer) {
                    await interaction.deferReply({ flags: modal.ephemeralDefer ? 64 : undefined });
                }
                await modal.execute(interaction);
            } catch (err) {
                await safeReply(interaction, err, 'Modal', interaction.customId);
            }
            return;
        }

        if (interaction.isAnySelectMenu()) {

            const select = selects.find(s =>
                typeof s.customId === 'string'
                    ? interaction.customId === s.customId
                    : s.customId.test(interaction.customId)
            );
            if (!select) return;
            try {
                if (select.defer) await interaction.deferReply();
                await select.execute(interaction);
            } catch (err) {
                await safeReply(interaction, err, 'Select', interaction.customId);
            }
            return;
        }

    }
} satisfies BotEvent<'interactionCreate'>;