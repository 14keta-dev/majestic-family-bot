
import { botEmojis } from "./emojis";
import { SERVER_COMPONENTS, ServerCode, ServerComponent } from "./server_emoji_map";



export interface Server extends ServerComponent {
    logo: string;
}

const SERVERS: Record<ServerCode, Server> = Object.fromEntries(
    SERVER_COMPONENTS.map((c) => [c.code, { ...c, logo: botEmojis[c.code] }])
) as Record<ServerCode, Server>;

export const servers = SERVERS;

export function getServer(code: ServerCode): Server {
    const server = SERVERS[code];
    if (!server) throw new Error(`Unknown server code: "${code}"`);
    return server;
}

export { SERVER_COMPONENTS, type ServerCode, type ServerComponent };