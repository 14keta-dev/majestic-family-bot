import { EmbedBuilder, GuildMember, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { Modal } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { getConfig, updateConfig } from "../../utils/config/store";
import { create_mp_embed } from "../../embed/EVENT/create.embed";
import { CREATE_EVENT_CUSTOM_IDS, EDIT_EVENT_CUSTOM_IDS } from "../../utils/EVENT/create_event_type";

export default {
    customId: EDIT_EVENT_CUSTOM_IDS.modal,
    dynamic: true,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const meta = metaBuilder(interaction.member as GuildMember, { modal: "submit_edit_mp" });

        const old_name = interaction.customId.slice(EDIT_EVENT_CUSTOM_IDS.modal.length + 1);

        try {
            log.modal.info(meta, "Edit mp modal submitted");

            const event_name = interaction.fields.getTextInputValue(CREATE_EVENT_CUSTOM_IDS.name_input);
            const create_channel_value = interaction.fields.getSelectedChannels(CREATE_EVENT_CUSTOM_IDS.create_channel);
            const tag_channel_value = interaction.fields.getSelectedChannels(CREATE_EVENT_CUSTOM_IDS.tag_channel);
            const replay_channel_value = interaction.fields.getSelectedChannels(CREATE_EVENT_CUSTOM_IDS.replay_channel);
            const moderation_roles_value = interaction.fields.getSelectedRoles(CREATE_EVENT_CUSTOM_IDS.allowed_roles);

            if (
                !event_name ||
                !create_channel_value || create_channel_value.size === 0 ||
                !tag_channel_value || tag_channel_value.size === 0 ||
                !replay_channel_value || replay_channel_value.size === 0 ||
                !moderation_roles_value || moderation_roles_value.size === 0
            ) return;

            const config = getConfig().event;
            const index = config.findIndex((m) => m.name === old_name);

            if (index === -1) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Этот тип МП больше не существует")]
                });
                return;
            }

            if (event_name !== old_name && config.find((m) => m.name === event_name)) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> МП с таким названиям уже есть")]
                });
                return;
            }

            const create_channel_data = create_channel_value.first();
            if (!create_channel_data) return;

            const create_channel = await interaction.guild.channels.fetch(create_channel_data.id);

            if (!create_channel?.isTextBased()) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder().setTitle("Ошибка")
                            .setDescription("> Канал создания должен быть текстовым")
                    ]
                });
                return;
            }

            const tag_channel_id = tag_channel_value.firstKey()!;
            const replay_channel_id = replay_channel_value.firstKey()!;
            const allowed_role_ids = [...moderation_roles_value.keys()];

            const existing = config[index];
            const create_embed = create_mp_embed({
                name: event_name,
                tag_channel: tag_channel_id,
                replay_channel: replay_channel_id,
            });

            let create_message_id = existing.create_message;

            if (create_channel.id === existing.create_channel) {
                try {
                    const old_message = await create_channel.messages.fetch(existing.create_message);
                    await old_message.edit({
                        components: create_embed,
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (error) {
                    log.modal.error(meta, error, "Failed to edit existing create_mp panel message, sending a new one");
                    const new_message = await create_channel.send({
                        components: create_embed,
                        flags: MessageFlags.IsComponentsV2
                    });
                    create_message_id = new_message.id;
                }
            } else {
                const new_message = await create_channel.send({
                    components: create_embed,
                    flags: MessageFlags.IsComponentsV2
                });
                create_message_id = new_message.id;

                try {
                    const old_channel = await interaction.guild.channels.fetch(existing.create_channel);
                    if (old_channel?.isTextBased()) {
                        const old_message = await old_channel.messages.fetch(existing.create_message);
                        await old_message.delete();
                    }
                } catch (error) {
                    log.modal.error(meta, error, "Failed to delete old create_mp panel message");
                }
            }

            const updated = [...config];
            updated[index] = {
                name: event_name,
                create_channel: create_channel.id,
                tag_channel: tag_channel_id,
                replay_channel: replay_channel_id,
                allowed_roles: allowed_role_ids,
                create_message: create_message_id
            };

            await updateConfig({ event: updated });

            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Готово").setDescription(`> МП **${event_name}** обновлено`)]
            });
        } catch (error) {
            log.modal.error(meta, error, "Failed to process edit_mp submission");
        }
    }
} satisfies Modal;