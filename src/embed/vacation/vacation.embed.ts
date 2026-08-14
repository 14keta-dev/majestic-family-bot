import {
  ActionRowBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageActionRowComponentBuilder,
  SelectMenuOptionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
} from "discord.js";

export const VACATION_EMBED_CUSTOM_IDS = {
  select: "embed:vacation:interact:select",
  take: "take-vacation",
  leave: "leave-vacation",
  list: "list-vacation",
};

export const VACATION_LIST_PAGINATION_CUSTOM_ID = {
  prev: "embed:vacation:vacation_list:prev",
  next: "embed:vacation:vacation_list:next",
} as const;

export const vacation_embed = () => {
  const container = new ContainerBuilder()
    .setAccentColor(0x282828)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(
          "https://cdn.discordapp.com/attachments/1399414333074833468/1537867176894267563/18cc92a8080a1afc.gif?ex=6a8099eb&is=6a7f486b&hm=606e85794f9afaaaef5c465d2484e3f2b3aa0a51f9993208ee132637b5d8fcc1&",
        ),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## Панель отпуска"),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Устали от игры или нужно временно уйти в инактив — оформите отпуск через панель ниже.",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true),
    )
    .addActionRowComponents(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(VACATION_EMBED_CUSTOM_IDS.select)
          .addOptions(
            new SelectMenuOptionBuilder()
              .setLabel("Взять отпуск")
              .setValue(VACATION_EMBED_CUSTOM_IDS.take)
              .setDescription("Выбирите дату и причину что бы взять оптуск"),
            new SelectMenuOptionBuilder()
              .setLabel("Вернуться")
              .setValue(VACATION_EMBED_CUSTOM_IDS.leave)
              .setDescription("Отдохнули? Вернитесь из отпуска"),
            new SelectMenuOptionBuilder()
              .setLabel("Список")
              .setValue(VACATION_EMBED_CUSTOM_IDS.list)
              .setDescription("Список участников в отпуске")
          ),
      ),
    );

  return [container];
};
