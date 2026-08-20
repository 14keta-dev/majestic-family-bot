import { EmbedBuilder, GuildMember, Message, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { Modal } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { getConfig, updateConfig } from "../../utils/config/store";
import { create_mp_embed } from "../../embed/EVENT/create.embed";
import { CREATE_EVENT_CUSTOM_IDS } from "../../utils/EVENT/create_event_type";

export default {
    customId: CREATE_EVENT_CUSTOM_IDS.modal,
    async execute(interaction: ModalSubmitInteraction) {

        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const meta = metaBuilder(interaction.member as GuildMember, { modal: "submit_new_mp" });

        try {
            log.modal.info(meta, "Create mp modal submitted");
            const mp_name = interaction.fields.getTextInputValue(CREATE_EVENT_CUSTOM_IDS.name_input);

            const create_channel_value = interaction.fields.getSelectedChannels(CREATE_EVENT_CUSTOM_IDS.create_channel);
            const tag_channel_value = interaction.fields.getSelectedChannels(CREATE_EVENT_CUSTOM_IDS.tag_channel);
            const replay_channel_value = interaction.fields.getSelectedChannels(CREATE_EVENT_CUSTOM_IDS.replay_channel);
            const moderation_roles_value = interaction.fields.getSelectedRoles(CREATE_EVENT_CUSTOM_IDS.allowed_roles);

            if (
                !mp_name ||
                !create_channel_value || create_channel_value.size === 0 ||
                !tag_channel_value || tag_channel_value.size === 0 ||
                !replay_channel_value || replay_channel_value.size === 0 ||
                !moderation_roles_value || moderation_roles_value.size === 0
            ) return;

            const config = getConfig().event;

            if (config.find((m) => m.name === mp_name)) {
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

            const create_embed = create_mp_embed({
                name: mp_name,
                tag_channel: tag_channel_id,
                replay_channel: replay_channel_id,
            });

            let create_message: Message | undefined;

            try {
                create_message = await create_channel.send({
                    components: create_embed,
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                log.modal.error(meta, error, "Failed to send create_mp panel message");
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Не удалось отправить сообщение")]
                });
                return;
            }

            await updateConfig({
                event: [
                    ...config,
                    {
                        name: mp_name,
                        create_channel: create_channel.id,
                        tag_channel: tag_channel_id,
                        replay_channel: replay_channel_id,
                        allowed_roles: allowed_role_ids,
                        create_message: create_message.id
                    }
                ]
            });

            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Готово").setDescription(`> МП **${mp_name}** создано`)]
            });
        } catch (error) {
            log.modal.error(meta, error, "Failed to process create_mp submission");
        }
    }
} satisfies Modal;