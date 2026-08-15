import { VoiceState } from "discord.js";
import { BotEvent } from "../../types";
import { create_temp_voice } from "../../utils/temp_voice/create_temp_voice.helper";
import { delete_temp_voice } from "../../utils/temp_voice/delete_voice.helper";

export default {
    name: "voiceStateUpdate",
    async execute(oldState: VoiceState, newState: VoiceState) {
        const member = newState.member ?? oldState.member;

        if (!member) return;

        const props = {
            member,
            guild: newState.guild,
            client: newState.client,
            oldState,
            newState,
        };

        await delete_temp_voice(props);
        await create_temp_voice(props);
    }
} satisfies BotEvent<"voiceStateUpdate">