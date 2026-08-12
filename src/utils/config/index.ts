import { FamilyApplicationsConfig } from "./family_applications";

export interface BotConfig {
    family_applications: FamilyApplicationsConfig;
}

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
    ? DeepPartial<T[K]>
    : T[K];
};


type Primitive = string | number | boolean | null | undefined | symbol | bigint;

export type DotPath<T, Depth extends unknown[] = []> = Depth["length"] extends 6
    ? never
    : T extends Primitive | unknown[]
    ? never
    : {
        [K in keyof T & string]: T[K] extends Primitive | unknown[]
        ? K
        : K | `${K}.${DotPath<T[K], [...Depth, unknown]>}`;
    }[keyof T & string];