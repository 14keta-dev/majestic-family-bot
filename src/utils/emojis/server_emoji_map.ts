
import { botEmojis } from "./emojis";

export enum Majestic_Servers {
    New_York = "New York",
    Detroit = "Detroit", 
    Chicago = "Chicago",
    San_Francisco = "San Francisco",
    Atlanta = "Atlanta",
    San_Diego = "San Diego",
    Los_Angeles = "Los Angeles",
    Miami = "Miami",
    Las_Vegas = "Las Vegas",
    Washington = "Washington",
    Dallas = "Dallas", 
    Boston = "Boston",
    Houston = "Houston",
    Seattle = "Seattle",
    Phoenix = "Phoenix",
    Denver = "Denver",
    Portland = "Portland",
    Orlando = "Orlando",
    Memphis = "Memphis",
}


export const SERVER_CODE_MAP: Record<Majestic_Servers, ServerCode> = {
    [Majestic_Servers.New_York]: "ny",
    [Majestic_Servers.Detroit]: "dt",
    [Majestic_Servers.Chicago]: "ch",
    [Majestic_Servers.San_Francisco]: "sf",
    [Majestic_Servers.Atlanta]: "at",
    [Majestic_Servers.San_Diego]: "sd",
    [Majestic_Servers.Los_Angeles]: "la",
    [Majestic_Servers.Miami]: "mi",
    [Majestic_Servers.Las_Vegas]: "lv",
    [Majestic_Servers.Washington]: "wa",
    [Majestic_Servers.Dallas]: "dl",
    [Majestic_Servers.Boston]: "bs",
    [Majestic_Servers.Houston]: "hs",
    [Majestic_Servers.Seattle]: "st",
    [Majestic_Servers.Phoenix]: "pn",
    [Majestic_Servers.Denver]: "dn",
    [Majestic_Servers.Portland]: "pt",
    [Majestic_Servers.Orlando]: "or",
    [Majestic_Servers.Memphis]: "mp",
};

export function getServerLogo(server: Majestic_Servers): string {
    const code = SERVER_CODE_MAP[server];
    const emoji = botEmojis[code];
    if (!emoji) {
        throw new Error(`No logo emoji configured for server "${server}" (code "${code}").`);
    }
    return emoji;
}


export interface ServerComponent {
    code: string;
    name: string;
}


export const SERVER_COMPONENTS = [
    { code: "ny", name: "New York" },
    { code: "dt", name: "Detroit" },
    { code: "ch", name: "Chicago" },
    { code: "sf", name: "San Francisco" },
    { code: "at", name: "Atlanta" },
    { code: "sd", name: "San Diego" },
    { code: "la", name: "Los Angeles" },
    { code: "mi", name: "Miami" },
    { code: "lv", name: "Las Vegas" },
    { code: "wa", name: "Washington" },
    { code: "dl", name: "Dallas" },
    { code: "bs", name: "Boston" },
    { code: "hs", name: "Houston" },
    { code: "st", name: "Seattle" },
    { code: "pn", name: "Phoenix" },
    { code: "dn", name: "Denver" },
    { code: "pt", name: "Portland" },
    { code: "or", name: "Orlando" },
    { code: "mp", name: "Memphis" },
    { code: "mcl", name: "MCL" },
] as const satisfies readonly ServerComponent[];

export type ServerCode = (typeof SERVER_COMPONENTS)[number]["code"];

