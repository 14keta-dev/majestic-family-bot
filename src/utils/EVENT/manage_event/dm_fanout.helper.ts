import { Client } from "discord.js";

interface DmFanoutOptions {
    client: Client;
    userIds: string[];
    payload: Parameters<Client["users"]["send"]>[1];
    concurrency?: number;
}

export interface DmFanoutResult {
    sent: string[];
    failed: string[];
}


export async function dmFanout({
    client,
    userIds,
    payload,
    concurrency = 5,
}: DmFanoutOptions): Promise<DmFanoutResult> {
    const sent: string[] = [];
    const failed: string[] = [];

    if (userIds.length === 0) return { sent, failed };

    let cursor = 0;

    async function worker(): Promise<void> {
        while (cursor < userIds.length) {
            const userId = userIds[cursor++];
            try {
                await client.users.send(userId, payload);
                sent.push(userId);
            } catch {
                failed.push(userId);
            }
        }
    }

    const workerCount = Math.min(concurrency, userIds.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return { sent, failed };
}