import { TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, type MessageActionRowComponentBuilder, ContainerBuilder } from 'discord.js';

export const CREATE_EVENT_EMBED_CUSTOM_IDS = {
    create: `embed:event:create`
}

interface Create_event_props {
    name: string;
    tag_channel: string;
    replay_channel: string,
}

export const create_mp_embed = ({ name, tag_channel, replay_channel }: Create_event_props) => {
    const container = [
        new ContainerBuilder()
            .setAccentColor(3158064)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## Создания ${name}`),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Нажмите кнопку **«Создать»**.
                    \nПеред вами появится **модальное окно** со всеми необходимыми данными.
                    \nПосле создания в <#${tag_channel}> будет опубликован эмбед с отдельной веткой. Участники должны отправить в ветке **«+»**, чтобы попасть в список участников.
                    \nПосле этого вы оставляете реакцию на сообщение:
                    \n* ✅ — основной список\n* ⏰ — запасной список
                    \nПосле окончания МП сообщение архивируется в <#${replay_channel}>.
                    \nУчастники смогут отправить откат через сообщение в личных сообщениях.`),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel(`Создать ${name}`)
                            .setCustomId(`${CREATE_EVENT_EMBED_CUSTOM_IDS.create}:${name}`),
                    ),
            ),
    ];


    return container;
}