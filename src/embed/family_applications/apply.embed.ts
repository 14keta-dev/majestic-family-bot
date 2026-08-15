import {
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ContainerBuilder,
    MediaGalleryItemBuilder,
    MediaGalleryBuilder,
    ActionRowBuilder,
    MessageActionRowComponentBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    parseEmoji,
} from "discord.js";
import { FamilyApplicationsConfig } from "../../utils/config/family_applications";
import { getServerLogo } from "../../utils/emojis/server_emoji_map";
import { APPLY_TYPES } from "../../utils/config/family_applications/applyFieldPresets";
import { botAssetsEmojis } from "../../utils/emojis/emojis";

const FALLBACK_BANNER_URL =
    "https://cdn.discordapp.com/attachments/1399414333074833468/1537867418335060018/c47931be337f9840.gif?ex=6a809a24&is=6a7f48a4&hm=18620d1706ef13dd495ddbb5f105b31652e2aca81ef8cf65fc7349d6e82de4e4&";

export const APPLY_SELECT_MENU_ID = "apply_select";
const DUMMY_OPTION_VALUE = "dummy_input";
const OPTION_DESCRIPTION_MAX_LENGTH = 100;

const COPY = {
    heading: "## Путь в семью начинается здесь!",
    dmNotice: (serverName: string, serverLogo: string) =>
        `${botAssetsEmojis.dot} Уведомление о приглашении на обзвон отправляется в личные сообщения.\n` +
        `Заявки открыты только на сервери ${serverName} ${serverLogo}`,
    processingTime: "> В среднем заявки обрабатываются в течение 12-ти часов",
    statusNotice:
        `${botAssetsEmojis.dot} Следите за статусом набора.\n\n` +
        "**Если возможности заполнить заявку нет – набор закрыт.\n" +
        "Каждое открытие набора сопровождается тегами в этом канале.**",
    reapplyNotice: "> В случае отказа можете подать заявку повторно через 2 дней",
    applyCta: `${botAssetsEmojis.dot} Подать заявку`,
    placeholderOpen: "Подать заявку",
    placeholderClosed: "Набор закрыт",
    noOptionsAvailable: "Недоступно",
    accentColor: 3553599
} as const;

function divider(): SeparatorBuilder {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true);
}

function text(content: string): TextDisplayBuilder {
    return new TextDisplayBuilder().setContent(content);
}

function buildApplyTypeSelect(config: FamilyApplicationsConfig, isOpen: boolean): StringSelectMenuBuilder {
    const select = new StringSelectMenuBuilder()
        .setCustomId(APPLY_SELECT_MENU_ID)
        .setPlaceholder(isOpen ? COPY.placeholderOpen : COPY.placeholderClosed)
        .setDisabled(!isOpen || APPLY_TYPES.length === 0);

    if (!isOpen || APPLY_TYPES.length === 0) {
        select.addOptions(new StringSelectMenuOptionBuilder().setLabel(COPY.noOptionsAvailable).setValue(DUMMY_OPTION_VALUE));
        return select;
    }

    const serverLogo = getServerLogo(config.server);
    const parsedLogo = parseEmoji(serverLogo);

    select.addOptions(
        APPLY_TYPES.map((applyType) => {
            const option = new StringSelectMenuOptionBuilder().setLabel(applyType.name).setValue(applyType.id);

            if (applyType.description) {
                option.setDescription(applyType.description.slice(0, OPTION_DESCRIPTION_MAX_LENGTH));
            }

            if (parsedLogo?.id && parsedLogo.name) {
                option.setEmoji({
                    id: parsedLogo.id,
                    name: parsedLogo.name,
                    animated: parsedLogo.animated ?? false,
                });
            }

            return option;
        }),
    );

    return select;
}

export function buildApplyEmbed(config: FamilyApplicationsConfig) {
    const isOpen = config.active === true;
    const select = buildApplyTypeSelect(config, isOpen);

    const container = new ContainerBuilder()
        .setAccentColor(COPY.accentColor)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(FALLBACK_BANNER_URL)),
        )
        .addSeparatorComponents(divider())
        .addTextDisplayComponents(text(COPY.heading))
        .addTextDisplayComponents(text(COPY.dmNotice(config.server, getServerLogo(config.server))))
        .addSeparatorComponents(divider())
        .addTextDisplayComponents(text(COPY.processingTime))
        .addSeparatorComponents(divider())
        .addTextDisplayComponents(text(COPY.statusNotice))
        .addSeparatorComponents(divider())
        .addTextDisplayComponents(text(COPY.reapplyNotice))
        .addSeparatorComponents(divider())
        .addTextDisplayComponents(text(COPY.applyCta))
        .addActionRowComponents(new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(select));

    return [container];
}