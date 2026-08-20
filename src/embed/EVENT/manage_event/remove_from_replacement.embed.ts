import { ActionRowBuilder, ContainerBuilder, Guild, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextDisplayBuilder } from "discord.js";
import { botAssetsEmojis } from "../../../utils/emojis/emojis";
import { EventSchema } from "../../../utils/EVENT/event.schema";

export const REMOVE_FROM_EVENT_REPLACEMENT_LIST_SELECT = "embed:manage_event:remove_replacement_select";

export const remove_from_event_replacement_list = async ({ event, guild }: { event: EventSchema; guild: Guild }) => {
    const participantIds = event.replacementListParticinapnt;

    if (!participantIds || participantIds.length === 0) {
        return [
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## Удалить из запасного состава"),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${botAssetsEmojis.dot} Запасной состав пуст`),
                ),
        ];
    }

    const ids = participantIds.slice(0, 25);

    let members;
    try {
        members = await guild.members.fetch({ user: ids });
    } catch (error) {
        members = new Map();
    }

    const options = ids.map((userId) => {
        const member = members.get(userId);

        if (member) {
            return new StringSelectMenuOptionBuilder()
                .setLabel(member.displayName)
                .setDescription(`@${member.user.username}`)
                .setValue(userId);
        }

        return new StringSelectMenuOptionBuilder()
            .setLabel(`Неизвестный пользователь`)
            .setDescription(userId)
            .setValue(userId);
    });

    const container =
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Удалить из запасного состава"),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${botAssetsEmojis.dot} Выбрать участников для удаления`),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`${REMOVE_FROM_EVENT_REPLACEMENT_LIST_SELECT}:${event.id}`)
                            .setMinValues(1)
                            .setMaxValues(options.length)
                            .addOptions(options)
                    ),
            );

    return [container];
};