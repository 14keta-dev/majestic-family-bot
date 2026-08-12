import { SETUP_FAMILY_APPLICATIONS_CUSTOM_ID } from "../../../embed/family_applications/set_up.embed";
import { createChannelSelectHandler } from "../../../utils/family_applications/createChannelSelectHandler";

export default createChannelSelectHandler(SETUP_FAMILY_APPLICATIONS_CUSTOM_ID.status_log, "status_log");