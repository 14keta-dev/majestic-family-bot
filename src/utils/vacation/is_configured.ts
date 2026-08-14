import { Vacation_config } from "../config/vacation";

function isSet(id: string | undefined): boolean {
  return id != null && id.trim().length > 0;
}

export function are_vacation_channels_configured(
  vacation: Vacation_config,
): boolean {
  if (!isSet(vacation.vacation_role) || !isSet(vacation.panel_channel)) {
    return false;
  }

  if (!vacation.controlled) {
    return true;
  }

  return (
    isSet(vacation.incoming_request) &&
    Array.isArray(vacation.ping_role) &&
    vacation.ping_role.length > 0
  );
}
