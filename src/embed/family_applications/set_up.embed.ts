import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    ContainerBuilder,
    MessageActionRowComponentBuilder,
    RoleSelectMenuBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextDisplayBuilder,
} from "discord.js";
import { FamilyApplicationsSetupDraft } from "../../utils/family_applications/setupDraftStore";
import { Majestic_Servers } from "../../utils/emojis/server_emoji_map";

export const SETUP_FAMILY_APPLICATIONS_CUSTOM_ID = {
    server: "setup:family_applications:server",
    apply_channel: "setup:family_applications:apply_channel",
    incoming_applications: "setup:family_applications:incoming_applications",
    interview_channel: "setup:family_applications:interview_channel",
    accepted_archive: "setup:family_applications:accepted_archive",
    rejected_archive: "setup:family_applications:rejected_archive",
    status_log: "setup:family_applications:status_log",
    priority_roles: "setup:family_applications:priority_roles",
    confirm: "setup:family_applications:confirm",
} as const;

const MAX_PRIORITY_ROLES = 10;

function serverSelect(defaultServer?: Majestic_Servers): StringSelectMenuBuilder {
    return new StringSelectMenuBuilder()
        .setCustomId(SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.server)
        .setPlaceholder("Выберите сервер")
        .addOptions(
            Object.values(Majestic_Servers).map((server) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(server)
                    .setValue(server)
                    .setDefault(server === defaultServer),
            ),
        );
}


function channelSelect(
    customId: string,
    channelTypes: ChannelType[],
    defaultChannelId?: string,
    minValues: 0 | 1 = 1,
): ChannelSelectMenuBuilder {
    const select = new ChannelSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(minValues === 0 ? "Выберите канал (необязательно)" : "Выберите канал")
        .addChannelTypes(...channelTypes)
        .setMinValues(minValues)
        .setMaxValues(1);

    if (defaultChannelId) {
        select.addDefaultChannels(defaultChannelId);
    }

    return select;
}

function priorityRoleSelect(defaultRoleIds?: string[]): RoleSelectMenuBuilder {
    const select = new RoleSelectMenuBuilder()
        .setCustomId(SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.priority_roles)
        .setPlaceholder("Выберите приоритетные роли (необязательно)")
        .setMinValues(0)
        .setMaxValues(MAX_PRIORITY_ROLES);

    if (defaultRoleIds?.length) {
        select.addDefaultRoles(defaultRoleIds);
    }

    return select;
}

export function build_set_up_family_applications_embed(draft: FamilyApplicationsSetupDraft = {}) {
    return [
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Сервер заявок"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(serverSelect(draft.server)),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Канал подачи заявок"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    channelSelect(SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.apply_channel, [ChannelType.GuildText], draft.apply_channel),
                ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Канал с новыми заявками "),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    channelSelect(SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.incoming_applications, [ChannelType.GuildText], draft.incoming_applications),
                ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Канал для обзвона кандидатов"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    channelSelect(
                        SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.interview_channel,
                        [ChannelType.GuildVoice, ChannelType.GuildStageVoice],
                        draft.interview_channel,
                    ),
                ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Архив принятых заявок"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    channelSelect(SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.accepted_archive, [ChannelType.GuildText], draft.accepted_archive),
                ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Архив отклонёных заявок"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    channelSelect(SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.rejected_archive, [ChannelType.GuildText], draft.rejected_archive),
                ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Канал публичных логов (необязательно)"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    channelSelect(
                        SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.status_log,
                        [ChannelType.GuildText],
                        draft.status_log,
                        0,
                    ),
                ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Приоритетные роли (необязательно)"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    priorityRoleSelect(draft.priority_roles),
                ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel(draft.isEdit ? "Сохранить" : "Подтвердить")
                            .setCustomId(SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.confirm),
                    ),
            ),
    ];
}