import { getConfig } from "../config/store";
import { VacationConfigError } from "./errors";

type RawConfig = ReturnType<typeof getConfig>;

export interface ControlledVacationConfig {
    controlled: true;
    vacationRoleId: string;
    incomingRequestChannelId: string;
    pingRoleIds: string[];
}

export interface LoggedVacationConfig {
    controlled: false;
    vacationRoleId: string;
    logChannelId: string;
}

export type ResolvedVacationConfig = ControlledVacationConfig | LoggedVacationConfig;

export function resolveVacationConfig(config: RawConfig): ResolvedVacationConfig {
    const { vacation, logs } = config;

    if (!vacation.vacation_role) {
        throw new VacationConfigError("vacation.vacation_role");
    }

    if (vacation.controlled) {
        if (!vacation.incoming_request) {
            throw new VacationConfigError("vacation.incoming_request");
        }
        return {
            controlled: true,
            vacationRoleId: vacation.vacation_role,
            incomingRequestChannelId: vacation.incoming_request,
            pingRoleIds: vacation.ping_role ?? [],
        };
    }

    if (!logs?.vacation_log) {
        throw new VacationConfigError("logs.vacation_log");
    }

    return {
        controlled: false,
        vacationRoleId: vacation.vacation_role,
        logChannelId: logs.vacation_log,
    };
}