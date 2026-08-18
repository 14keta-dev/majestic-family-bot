import { backpack_interface } from "../config/backpack";

function isSet(id: string | undefined): boolean {
    return id != null && id.trim().length > 0;
}

export function are_backpack_channels_configured(backpack: backpack_interface): boolean {
    if (
        !isSet(backpack.panel_channel) ||
        !isSet(backpack.panel_message) ||
        backpack.allowed_roles.length === 0
    ) {
        return false;
    }

    return true;
}