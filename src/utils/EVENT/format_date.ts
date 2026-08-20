export function parseFlexibleDateTime(input: string, year?: number): string {
    const trimmed = input.trim().replace(/\s+/g, " ");
    const [timePart, datePart] = trimmed.split(" ");

    if (!timePart || !datePart) {
        throw new Error(`Invalid input "${input}". Expected format "time date", e.g. "14:30 21.08"`);
    }

    const timeNums = timePart.split(/[.:]/).map(Number);
    const dateNums = datePart.split(".").map(Number);

    if (timeNums.length !== 2 || timeNums.some(Number.isNaN)) {
        throw new Error(`Invalid time part "${timePart}". Expected "hh:mm" or "mm:hh" (or with ".")`);
    }
    if (dateNums.length !== 2 || dateNums.some(Number.isNaN)) {
        throw new Error(`Invalid date part "${datePart}". Expected "dd.mm"`);
    }

    const [a, b] = timeNums;
    let hour: number;
    let minute: number;

    if (a > 23 && b <= 23) {
        minute = a;
        hour = b;
    } else if (b > 23 && a <= 23) {
        hour = a;
        minute = b;
    } else if (a <= 23 && b <= 23) {
        hour = a;
        minute = b;
    } else {
        throw new Error(`Invalid time "${timePart}": neither value fits as hours (0-23)`);
    }

    if (minute > 59) {
        throw new Error(`Invalid minutes "${minute}" in "${timePart}"`);
    }

    const [day, month] = dateNums;
    if (day < 1 || day > 31 || month < 1 || month > 12) {
        throw new Error(`Invalid date "${datePart}"`);
    }

    const now = new Date();
    const targetYear = year ?? now.getFullYear();

    let date = new Date(targetYear, month - 1, day, hour, minute, 0, 0);

    if (year === undefined && date.getTime() < now.getTime()) {
        date = new Date(targetYear + 1, month - 1, day, hour, minute, 0, 0);
    }

    return date.toISOString();
}

export function formatDateTimeForInput(isoString: string): string {
    const date = new Date(isoString);

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${hours}:${minutes} ${day}.${month}`;
}