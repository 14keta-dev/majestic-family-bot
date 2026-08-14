
export class VacationConfigError extends Error {
    constructor(missingKey: string) {
        super(`Vacation config is missing required key: ${missingKey}`);
        this.name = "VacationConfigError";
    }
}

export class VacationRoleError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = "VacationRoleError";
    }
}

export class VacationDeliveryError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = "VacationDeliveryError";
    }
}