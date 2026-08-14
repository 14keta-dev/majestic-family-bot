import { SET_UP_VACATION_CUSTOM_ID } from "../../../embed/vacation/set_up.embed";
import { createVacationChannelSelectHandler } from "../../../utils/vacation/createChannelSelectHandler";

export default createVacationChannelSelectHandler(SET_UP_VACATION_CUSTOM_ID.incoming_request, "incoming_request");