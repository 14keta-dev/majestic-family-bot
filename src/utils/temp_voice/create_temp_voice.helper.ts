import { ChannelType, Client, Guild, GuildMember, PermissionFlagsBits, VoiceState, VoiceChannel } from "discord.js";
import { getConfig } from "../config/store";
import { log } from "../logger";
import { temp_voice_store } from "./schema";

interface Temp_voice_create_props {
    member: GuildMember;
    guild: Guild;
    client: Client,
    oldState: VoiceState,
    newState: VoiceState
};

export async function create_temp_voice({ member, guild, newState }: Temp_voice_create_props) {

    if (!member) {
        throw new Error("No member provided, aborting");
    }

    try {
        const config = getConfig();

        if (newState.channelId !== config.temp_voice.create_channel) return;

        const temp_voice_category = await guild.channels.fetch(config.temp_voice.category);

        if (!temp_voice_category || temp_voice_category.type !== ChannelType.GuildCategory) {
            log.error("Temp voice category is missing or not a category channel");
            return;
        }

        let temp_voice_channel: VoiceChannel;

        try {
            temp_voice_channel = await guild.channels.create({
                name: `・комната ${member.user.displayName}`,
                type: ChannelType.GuildVoice,
                parent: temp_voice_category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.SendMessages],
                        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
                    },
                    {
                        id: member.id,
                        allow: [PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.KickMembers],
                        deny: [PermissionFlagsBits.SendMessages]
                    }
                ]
            });

            await newState.setChannel(temp_voice_channel.id);
        } catch (error) {
            log.fatal(`Could not create temp voice: ${error}`);
            await newState.disconnect().catch(() => { });
            return;
        }

        await temp_voice_store.create_voice({
            id: temp_voice_channel.id,
            ownerId: member.id,
        });
    } catch (error) {
        log.fatal(`Unexpected error in create_temp_voice: ${error}`);
    }
}