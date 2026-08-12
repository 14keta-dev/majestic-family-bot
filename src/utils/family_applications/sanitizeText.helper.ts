
export function escapeForCodeBlock(input: string): string {
    return input.replace(/`/g, "\u200b`\u200b");
}


export function truncateField(input: string, maxLength = 700): string {
    if (input.length <= maxLength) return input;
    return `${input.slice(0, maxLength).trimEnd()}\n… (обрезано, ${input.length - maxLength} симв.)`;
}