import { KeyedMutex } from "./create/keyed-mutex";

export const backpack_topology_lock = new KeyedMutex();

export const backpack_create_lock = new KeyedMutex();