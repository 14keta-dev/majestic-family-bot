import { Client, Guild, GuildMember, VoiceState } from "discord.js";
import { log } from "../logger";
import { temp_voice_store } from "./schema";

interface Temp_voice_delete_props {
    member: GuildMember;
    guild: Guild;
    client: Client;
    oldState: VoiceState;
    newState: VoiceState;
}

export async function delete_temp_voice({ member, guild, oldState, newState }: Temp_voice_delete_props) {
    try {
        if (!oldState.channelId) return;
        if (oldState.channelId === newState.channelId) return;

        const entry = await temp_voice_store.get(oldState.channelId);

        if (!entry) return;
        if (entry.ownerId !== member.id) return; 

        const channel = await guild.channels.fetch(oldState.channelId).catch(() => null);

        if (channel) {
            await channel.delete(`Temp voice owner (${member.user.tag}) left`).catch((error) => {
                log.error(`Failed to delete temp voice channel ${oldState.channelId}: ${error}`);
            });
        }

        await temp_voice_store.delete_voice({ id: oldState.channelId });
    } catch (error) {
        log.fatal(`Unexpected error in delete_temp_voice: ${error}`);
    }
}