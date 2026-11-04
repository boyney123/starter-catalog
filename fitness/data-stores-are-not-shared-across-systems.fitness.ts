import { defineFitnessFunction } from '@eventcatalog/fitness';
import { getEndpoints } from './lib/catalog';

// A data store written by services in different systems couples those systems through its
// schema: neither can change its tables without coordinating with the other. Systems should
// share data through messages instead.
export default defineFitnessFunction({
  id: 'data-stores-are-not-shared-across-systems',
  name: 'Data stores are written by one system only',
  severity: 'error',

  async run({ catalog }) {
    const [systems, endpoints] = await Promise.all([catalog.getSystems({ latestOnly: true }), getEndpoints(catalog)]);

    const systemOf = new Map<string, string>();
    for (const system of systems ?? []) {
      for (const service of system.services ?? []) systemOf.set(service.id, system.id);
    }

    const writersByStore = new Map<string, typeof endpoints>();
    for (const endpoint of endpoints) {
      for (const store of endpoint.writesTo) {
        writersByStore.set(store.id, [...(writersByStore.get(store.id) ?? []), endpoint]);
      }
    }

    return [...writersByStore].flatMap(([storeId, writers]) => {
      // Services outside any system are reported by services-belong-to-a-system instead.
      const owningSystems = new Set(writers.flatMap((writer) => systemOf.get(writer.id) ?? []));
      if (owningSystems.size < 2) return [];
      return [
        {
          message: `${storeId} is written by services in ${owningSystems.size} systems: ${[...owningSystems].join(', ')}`,
          resources: [
            { type: 'container', id: storeId },
            ...writers.map((w) => ({ type: w.type, id: w.id, version: w.version })),
          ],
          suggestion: 'Keep writes inside the owning system and share the data with other systems through events.',
        },
      ];
    });
  },
});
