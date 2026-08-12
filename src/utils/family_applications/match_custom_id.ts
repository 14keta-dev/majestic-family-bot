
export function matchCustomId(
    interactionId: string,
    registeredId: string,
    { dynamic = false }: { dynamic?: boolean } = {}
): boolean {
    if (interactionId === registeredId) return true;
    if (!dynamic) return false;
    return interactionId.startsWith(`${registeredId}:`);
}