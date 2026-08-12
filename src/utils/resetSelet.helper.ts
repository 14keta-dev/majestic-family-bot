import {
    StringSelectMenuInteraction,
    ComponentType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ActionRow,
    MessageActionRowComponent,
    MessageFlags,
} from "discord.js";

export interface ResetSelectMenuOptions {

    delayMs?: number;

    onSuccess?: (customId: string) => void;

    onError?: (error: unknown, interaction: StringSelectMenuInteraction) => void;
}

function clearSelectDefaultsDeep(component: any): any {
    if (component.type === ComponentType.StringSelect) {
        return {
            ...component,
            options: component.options?.map((opt: any) => ({ ...opt, default: false })) ?? [],
        };
    };


    if (Array.isArray(component.components)) {
        return {
            ...component,
            components: component.components.map(clearSelectDefaultsDeep),
        };
    }
    return component;
}


function rebuildComponents(
    rows: ActionRow<MessageActionRowComponent>[],
): ActionRowBuilder<StringSelectMenuBuilder>[] {
    return rows
        .filter((row) => row.type === ComponentType.ActionRow)
        .map((row) => {
            const rebuilt = row.components.map((component) => {
                if (component.type !== ComponentType.StringSelect) {
                    return component as unknown as StringSelectMenuBuilder;
                }

                return new StringSelectMenuBuilder()
                    .setCustomId(component.customId)
                    .setPlaceholder(component.placeholder ?? "Make a selection")
                    .setMinValues(component.minValues ?? 1)
                    .setMaxValues(component.maxValues ?? 1)
                    .setDisabled(false)
                    .addOptions(
                        component.options.map((opt) => ({
                            label: opt.label,
                            value: opt.value,
                            ...(opt.description && { description: opt.description }),
                            ...(opt.emoji && { emoji: opt.emoji }),
                            default: false,
                        })),
                    );
            });

            return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rebuilt);
        });
}


export function resetSelectMenu(
    interaction: StringSelectMenuInteraction,
    options: ResetSelectMenuOptions | number = {},
): void {
    const resolved: ResetSelectMenuOptions =
        typeof options === "number" ? { delayMs: options } : options;

    const { delayMs = 500, onSuccess, onError } = resolved;

    const customId = interaction.customId;


    setTimeout(async () => {

        try {
            const isV2 = interaction.message.flags.has(MessageFlags.IsComponentsV2);

            if (isV2) {
                const rawComponents = (interaction.message.toJSON() as any).components ?? [];
                const cleared = rawComponents.map(clearSelectDefaultsDeep);


                await interaction.message.edit({ components: cleared, flags: MessageFlags.IsComponentsV2 })
            } else {
                const rows = interaction.message.components as ActionRow<MessageActionRowComponent>[];
                const components = rebuildComponents(rows);

                await interaction.message.edit({ components })
            }

            onSuccess?.(customId);

        } catch (error) {

            onError?.(error, interaction);
        }
    }, delayMs);
}