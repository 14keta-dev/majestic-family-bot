import { SETUP_AFK_CUSTOM_ID } from "../../../embed/AFK/set_up.embed";
import { createAfkChannelSelectHandler } from "../../../utils/AFK/createChannelSelectHandler";

export default createAfkChannelSelectHandler(SETUP_AFK_CUSTOM_ID.panel_channel, "panel_channel");