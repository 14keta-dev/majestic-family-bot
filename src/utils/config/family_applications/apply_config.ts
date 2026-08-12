export const MAX_MODAL_FIELDS = 5;

export interface ApplyTypeField {
    id: string;
    label: string;
    placeholder?: string;
    style: "short" | "paragraph";
    required?: boolean;
    minLength?: number;
    maxLength?: number;
}

export interface ApplyType {
    id: string;
    name: string;
    description?: string;
    fields: string[];
    pingRole: string;
    rewardRoles: string[];
}