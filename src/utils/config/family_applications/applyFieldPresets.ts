import { ApplyType, ApplyTypeField, MAX_MODAL_FIELDS } from "./apply_config";

//Fields used in modal when user apply
export const APPLY_FIELDS: Record<string, ApplyTypeField> = {
    name_age_nickname: {
        id: "name_age_nickname",
        label: "Ваше имя | Возраст | Ник в игре",
        placeholder: "Никита | 19 | Keta",
        style: "short",
        required: true,
    },
    level_game_h_avrage_time: {
        id: "level_game_h_avrage_time",
        label: "Лвл в игре | Онлайн | Часовой пояс",
        placeholder: "10 | 5-12 | -1 msk",
        style: "short",
        required: true,
    },
    expreience_in_other: {
        id: "expreience_in_other",
        label: "Опыт в других семьях",
        placeholder: "Был в x ливнул иза y",
        style: "paragraph",
        required: true,
    },
    replay_spesh_saiga: {
        id: "replay_spesh_saiga",
        label: "Откат гг",
        placeholder: "Откат гг спеш + сайга 5+ мин",
        style: "paragraph",
        required: true,
    },
};

//different apply types in select menu in application embed 
export const APPLY_TYPES: ApplyType[] = [
    {
        id: "easy",
        name: "Упращенная",
        description: "Минимальные требования для встепления",
        fields: ["name_age_nickname", "level_game_h_avrage_time", "expreience_in_other"],
        pingRole: "1534243045413884015",
        rewardRoles: ["1534235007424532772", "1534260715291017347"],
    },
];

function validateApplyConfig(): void {
    for (const type of APPLY_TYPES) {
        if (type.fields.length === 0) {
            throw new Error(`Apply type "${type.id}" has no fields.`);
        }
        if (type.fields.length > MAX_MODAL_FIELDS) {
            throw new Error(
                `Apply type "${type.id}" has ${type.fields.length} fields, exceeding the modal limit of ${MAX_MODAL_FIELDS}.`,
            );
        }
        for (const fieldId of type.fields) {
            if (!APPLY_FIELDS[fieldId]) {
                throw new Error(`Apply type "${type.id}" references unknown field "${fieldId}".`);
            }
        }
    }

    const ids = APPLY_TYPES.map((t) => t.id);
    const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicateIds.length > 0) {
        throw new Error(`Duplicate apply type id(s): ${[...new Set(duplicateIds)].join(", ")}`);
    }
}

validateApplyConfig();

export function getApplyType(id: string): ApplyType | undefined {
    return APPLY_TYPES.find((t) => t.id === id);
}