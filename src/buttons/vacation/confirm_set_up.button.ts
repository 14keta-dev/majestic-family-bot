import {
  ButtonInteraction,
  CategoryChannel,
  ChannelType,
  EmbedBuilder,
  Message,
  MessageFlags,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { getConfig, updateConfig } from "../../utils/config/store";
import { Vacation_config } from "../../utils/config/vacation";
import { Button } from "../../types";
import {
  clearVacationDraft,
  getVacationDraft,
  isVacationDraftComplete,
  missingVacationDraftFields,
  Vacation_config_draft,
} from "../../utils/vacation/draft_store";
import { vacation_embed } from "../../embed/vacation/vacation.embed";
import { SET_UP_VACATION_CUSTOM_ID } from "../../embed/vacation/set_up.embed";

const FIELD_LABELS: Record<string, string> = {
  controlled: "Тип отпуска",
  vacation_role: "Роль отпуска",
  panel_channel: "Канал панели",
  ping_role: "Роли для пинга",
  incoming_request: "Канал входящих запросов",
};

type Meta = ReturnType<typeof metaBuilder>;

function draftToVacationConfig(draft: Vacation_config_draft): Vacation_config {
  return {
    controlled: draft.controlled!,
    vacation_role: draft.vacation_role!,
    panel_channel: draft.panel_channel!,
    panel_message: "", 
    ...(draft.controlled
      ? {
        ping_role: draft.ping_role,
        incoming_request: draft.incoming_request,
      }
      : {}),
  };
}

export default {
  customId: SET_UP_VACATION_CUSTOM_ID.confirm,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.inCachedGuild()) return;

    const draft = getVacationDraft(interaction.message.id);
    if (draft.initiatedBy && draft.initiatedBy !== interaction.user.id) {
      await interaction.reply({
        content:
          "Эту настройку начал другой администратор. Попросите его подтвердить, либо начните заново.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const meta = metaBuilder(interaction.member, {
      button: "vacation_setup_confirm",
    });

    try {
      log.button.info(meta, "Deferring update");
      await interaction.deferUpdate();
    } catch (error) {
      log.button.error(meta, "Could not defer update in time");
      await safeReply(
        interaction,
        error,
        "vacation_setup_confirm.deferUpdate",
        interaction.id,
      );
      return;
    }

    try {
      if (!isVacationDraftComplete(draft)) {
        const missing = missingVacationDraftFields(draft).map(
          (key) => FIELD_LABELS[key] ?? key,
        );
        await interaction.followUp({
          content: `Заполните все поля перед подтверждением. Не выбрано: ${missing.join(", ")}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (draft.isEdit) {
        await handleEditConfirm(interaction, draft, meta);
      } else {
        await handleNewSetupConfirm(interaction, draft, meta);
      }
    } catch (error) {
      log.button.error(meta, "Failed to save vacation setup");
      await safeReply(
        interaction,
        error,
        "vacation_setup_confirm.execute",
        interaction.id,
      );
    }
  },
} satisfies Button;


async function resolveVacationLogChannelId(
  interaction: ButtonInteraction<"cached">,
  draft: Vacation_config_draft,
  meta: Meta,
): Promise<{ vacation_log: string; category?: string } | null> {
  if (draft.vacation_log) {
    return { vacation_log: draft.vacation_log };
  }

  const config = getConfig();

  if (config.logs.vacation_log) {
    return { vacation_log: config.logs.vacation_log };
  }

  let categoryId = config.logs.category;

  if (!categoryId) {
    let category: CategoryChannel;
    try {
      category = await interaction.guild.channels.create({
        name: "bot-logs",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });
    } catch (error) {
      log.button.error(meta, "Failed to create bot-logs category");
      await safeReply(
        interaction,
        error,
        "vacation_setup_confirm.createLogCategory",
        interaction.id,
      );
      return null;
    }
    categoryId = category.id;
  }

  let logChannel: TextChannel;
  try {
    logChannel = await interaction.guild.channels.create({
      name: "vacation-logs",
      parent: categoryId,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });
  } catch (error) {
    log.button.error(meta, "Failed to create vacation-logs channel");
    await safeReply(
      interaction,
      error,
      "vacation_setup_confirm.createLogChannel",
      interaction.id,
    );
    return null;
  }

  return { vacation_log: logChannel.id, category: categoryId };
}

async function handleNewSetupConfirm(
  interaction: ButtonInteraction<"cached">,
  draft: Vacation_config_draft,
  meta: Meta,
) {
  const nextVacationConfig = draftToVacationConfig(draft);

  const panel_channel = await interaction.guild.channels.fetch(
    nextVacationConfig.panel_channel,
  );
  if (!panel_channel?.isTextBased()) {
    log.button.error(
      meta,
      "Vacation panel channel is not text based, could not send panel",
    );
    await interaction.followUp({
      content:
        "Выбранный канал панели не текстовый. Настройка не сохранена — выберите канал заново.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const resolvedLogs = await resolveVacationLogChannelId(
    interaction,
    draft,
    meta,
  );
  if (!resolvedLogs) return;

  let panelMessage: Message;
  try {
    panelMessage = await panel_channel.send({
      components: vacation_embed(),
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    log.button.error(
      meta,
      "Failed to send vacation panel message to panel channel",
    );
    await safeReply(
      interaction,
      error,
      "vacation_setup_confirm.sendPanelMessage",
      interaction.id,
    );
    return;
  }

  await updateConfig({
    vacation: {
      ...nextVacationConfig,
      panel_message: panelMessage.id,
    },
    logs: resolvedLogs,
  });

  clearVacationDraft(interaction.message.id);
  log.button.info(meta, "Vacation setup completed");

  await interaction.deleteReply();
  await interaction.followUp({
    embeds: [new EmbedBuilder().setTitle("Готово").setColor("Green")],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleEditConfirm(
  interaction: ButtonInteraction<"cached">,
  draft: Vacation_config_draft,
  meta: Meta,
) {
  const previous = getConfig().vacation;
  const previousPanelChannel = previous.panel_channel;
  const previousMessageId = previous.panel_message;
  const channelChanged = draft.panel_channel !== previousPanelChannel;

  const nextVacationConfig = draftToVacationConfig(draft);

  const resolvedLogs = await resolveVacationLogChannelId(
    interaction,
    draft,
    meta,
  );
  if (!resolvedLogs) return;

  let newMessageId: string | null = previousMessageId || null;

  if (!channelChanged && previousMessageId) {
    try {
      const panelChannel =
        await interaction.guild.channels.fetch(previousPanelChannel);
      if (panelChannel?.isTextBased()) {
        const existing = await panelChannel.messages.fetch(previousMessageId);
        await existing.edit({
          components: vacation_embed(),
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        newMessageId = null;
      }
    } catch {
      log.button.warn(
        meta,
        "Could not edit existing vacation panel message in place, reposting",
      );
      newMessageId = null;
    }
  }

  if (channelChanged || !newMessageId) {
    const panelChannel = await interaction.guild.channels.fetch(
      nextVacationConfig.panel_channel,
    );
    if (!panelChannel?.isTextBased()) {
      log.button.error(
        meta,
        "Vacation panel channel is not text based, could not update panel",
      );
      await interaction.followUp({
        content:
          "Выбранный канал панели не текстовый. Остальные настройки сохранены, но панель не обновлена — выберите канал заново.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let panelMessage: Message;
    try {
      panelMessage = await panelChannel.send({
        components: vacation_embed(),
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      log.button.error(
        meta,
        "Failed to send new vacation panel message to panel channel",
      );
      await safeReply(
        interaction,
        error,
        "vacation_setup_confirm.editSendPanelMessage",
        interaction.id,
      );
      return;
    }

    newMessageId = panelMessage.id;

    if (channelChanged && previousMessageId) {
      try {
        const oldChannel =
          await interaction.guild.channels.fetch(previousPanelChannel);
        if (oldChannel?.isTextBased()) {
          await oldChannel.messages.delete(previousMessageId);
        }
      } catch {
        // Old message/channel already gone — nothing to clean up.
      }
    }
  }

  await updateConfig({
    vacation: {
      ...nextVacationConfig,
      panel_message: newMessageId ?? "",
    },
    logs: resolvedLogs,
  });

  clearVacationDraft(interaction.message.id);
  log.button.info(meta, "Vacation settings updated");

  await interaction.deleteReply();
  await interaction.followUp({
    embeds: [
      new EmbedBuilder().setTitle("Настройки сохранены").setColor("Green"),
    ],
    flags: MessageFlags.Ephemeral,
  });
}