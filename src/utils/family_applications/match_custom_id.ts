export function matchCustomId(
    interactionId: string,
    registeredId: string,
    { dynamic = false }: { dynamic?: boolean } = {}
): boolean {
    if (interactionId === registeredId) return true;
    if (!dynamic) return false;
    if (!interactionId.startsWith(registeredId)) return false;
    
    const rest = interactionId.slice(registeredId.length);
    return rest === '' || rest.startsWith(':');
}