// Shared helpers for the fitness functions in this folder. Only `*.fitness.ts` files are run,
// so this file is imported, never evaluated on its own.
import type { FitnessContext } from '@eventcatalog/fitness';

type Catalog = FitnessContext['catalog'];

export type MessageType = 'event' | 'command' | 'query';

export type Message = { type: MessageType; id: string; name: string; version: string };

type Pointer = { id: string; version?: string };

export type Endpoint = {
  type: 'service' | 'agent';
  id: string;
  name: string;
  version: string;
  sends: Pointer[];
  receives: Pointer[];
  writesTo: Pointer[];
};

/** The latest version of every event, command and query, keyed by id. */
export async function getLatestMessages(catalog: Catalog): Promise<Map<string, Message>> {
  const [events, commands, queries] = await Promise.all([
    catalog.getEvents({ latestOnly: true }),
    catalog.getCommands({ latestOnly: true }),
    catalog.getQueries({ latestOnly: true }),
  ]);

  const messages = new Map<string, Message>();
  for (const [type, list] of [
    ['event', events],
    ['command', commands],
    ['query', queries],
  ] as const) {
    for (const message of list ?? []) {
      messages.set(message.id, { type, id: message.id, name: message.name, version: message.version });
    }
  }
  return messages;
}

/** The latest version of every service and agent: the resources that send and receive messages. */
export async function getEndpoints(catalog: Catalog): Promise<Endpoint[]> {
  const [services, agents] = await Promise.all([
    catalog.getServices({ latestOnly: true }),
    catalog.getAgents({ latestOnly: true }),
  ]);

  const toEndpoint = (type: Endpoint['type'], resource: any): Endpoint => ({
    type,
    id: resource.id,
    name: resource.name,
    version: resource.version,
    sends: resource.sends ?? [],
    receives: resource.receives ?? [],
    writesTo: resource.writesTo ?? [],
  });

  return [
    ...(services ?? []).map((service) => toEndpoint('service', service)),
    ...(agents ?? []).map((agent) => toEndpoint('agent', agent)),
  ];
}

/** True for an exact `x.y.z` pin. `latest`, ranges (`1.x`, `^1.0.0`) and a missing version float. */
export const isExactVersion = (version?: string): version is string =>
  Boolean(version && /^\d+\.\d+\.\d+$/.test(version));

/** Compares two `x.y.z` versions: negative if `a` is older than `b`. */
export function compareVersions(a: string, b: string): number {
  const [left, right] = [a, b].map((version) => version.split('.').map(Number));
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

/**
 * The pins in `pointers` that name an older exact version than the message's latest.
 * Pins to messages that don't exist are left to the linter (`refs/resource-exists`).
 */
export function findOutdatedPins(pointers: Pointer[], messages: Map<string, Message>) {
  return pointers.flatMap((pointer) => {
    const message = messages.get(pointer.id);
    if (!message || !isExactVersion(pointer.version) || !isExactVersion(message.version)) return [];
    return compareVersions(pointer.version, message.version) < 0 ? [{ pinned: pointer.version, message }] : [];
  });
}
