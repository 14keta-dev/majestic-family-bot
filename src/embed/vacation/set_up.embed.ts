import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ContainerBuilder,
  MessageActionRowComponentBuilder,
  RoleSelectMenuBuilder,
  SelectMenuOptionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { Vacation_config_draft } from "../../utils/vacation/draft_store";

const BASE_URL = "setup:vacation:";

export const SET_UP_VACATION_CUSTOM_ID = {
  type_select: `${BASE_URL}type_select`,
  vacation_role: `${BASE_URL}vacation_role`,
  panel_channel: `${BASE_URL}panel_channel`,
  ping_role: `${BASE_URL}ping_role`,
  incoming_request: `${BASE_URL}incoming_request`,
  vacation_log: `${BASE_URL}vacation_log`,
  confirm: `${BASE_URL}confirm`,
} as const;

function typeSelect(selected?: boolean): StringSelectMenuBuilder {
  return new StringSelectMenuBuilder()
    .setCustomId(SET_UP_VACATION_CUSTOM_ID.type_select)
    .setPlaceholder("Выберите тип отпуска")
    .addOptions(
      new SelectMenuOptionBuilder()
        .setLabel("Контролируемый")
        .setValue("controlled")
        .setDescription("Каждый запрос отправляется на проверку")
        .setDefault(selected === true),
      new SelectMenuOptionBuilder()
        .setLabel("Свободный")
        .setValue("free")
        .setDescription("Любой может взять отпуск без проверки")
        .setDefault(selected === false),
    );
}

function channelSelect(
  customId: string,
  defaultChannelId?: string,
  minValues: 0 | 1 = 1,
): ChannelSelectMenuBuilder {
  const select = new ChannelSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(
      minValues === 0 ? "Выберите канал (необязательно)" : "Выберите канал",
    )
    .addChannelTypes(ChannelType.GuildText)
    .setMinValues(minValues)
    .setMaxValues(1);

  if (defaultChannelId) {
    select.addDefaultChannels(defaultChannelId);
  }

  return select;
}

function roleSelect(
  customId: string,
  defaultRoleIds: string[] = [],
  maxValues = 1,
): RoleSelectMenuBuilder {
  const select = new RoleSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(maxValues > 1 ? "Выберите роли" : "Выберите роль")
    .setMinValues(1)
    .setMaxValues(maxValues);

  if (defaultRoleIds.length > 0) {
    select.addDefaultRoles(defaultRoleIds);
  }

  return select;
}


export function build_set_up_vacation_embed(draft: Vacation_config_draft = {}) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("> Тип отпуска"),
    )
    .addActionRowComponents(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        typeSelect(draft.controlled),
      ),
    );

  // Nothing further to render until a type has been chosen.
  if (draft.controlled === undefined) {
    return [container];
  }

  container
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("> Роль отпуска"),
    )
    .addActionRowComponents(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        roleSelect(
          SET_UP_VACATION_CUSTOM_ID.vacation_role,
          draft.vacation_role ? [draft.vacation_role] : [],
        ),
      ),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("> Канал панели отпуска"),
    )
    .addActionRowComponents(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        channelSelect(
          SET_UP_VACATION_CUSTOM_ID.panel_channel,
          draft.panel_channel,
        ),
      ),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> Канал логов отпуска (необязательно)",
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        channelSelect(
          SET_UP_VACATION_CUSTOM_ID.vacation_log,
          draft.vacation_log,
          0,
        ),
      ),
    );

  if (draft.controlled) {
    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> Роли для пинга при новом запросе",
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          roleSelect(
            SET_UP_VACATION_CUSTOM_ID.ping_role,
            draft.ping_role ?? [],
            5,
          ),
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("> Канал входящих запросов"),
      )
      .addActionRowComponents(
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          channelSelect(
            SET_UP_VACATION_CUSTOM_ID.incoming_request,
            draft.incoming_request,
          ),
        ),
      );
  }

  container
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true),
    )
    .addActionRowComponents(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setLabel(draft.isEdit ? "Сохранить" : "Подтвердить")
          .setCustomId(SET_UP_VACATION_CUSTOM_ID.confirm),
      ),
    );

  return [container];
}