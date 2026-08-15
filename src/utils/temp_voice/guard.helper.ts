import { EmbedBuilder, GuildMember, PermissionFlagsBits } from "discord.js";
import { temp_voice_store } from "./schema";
import { log } from "../logger";

const ERROR_COLOR = 0x282828;

function error_embed(description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(ERROR_COLOR)
        .setDescription(description);
}

export async function temp_voice_guard(member: GuildMember): Promise<EmbedBuilder | null> {
    if (!member) {
        throw new Error("No member provided, aborting");
    }

    try {
        const voice_channel = member.voice.channel;

        if (!voice_channel) {
            return error_embed("> Вы должны находиться в голосовом канале");
        }

        const entry = await temp_voice_store.get(voice_channel.id);

        if (!entry) {
            return error_embed("> Вы должны находиться во временной комнате");
        }

        const is_owner = entry.ownerId === member.id;
        const is_admin = member.permissions.has(PermissionFlagsBits.Administrator);

        if (!is_owner && !is_admin) {
            return error_embed("> У вас нет доступа к управлению этой комнатой");
        }

        return null;
    } catch (error) {
        log.fatal(`Unexpected error in temp_voice_guard: ${error}`);
        return error_embed("> роизошла ошибка, попробуйте позже");
    }
}