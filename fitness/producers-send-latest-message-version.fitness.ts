import { defineFitnessFunction } from '@eventcatalog/fitness';
import { findOutdatedPins, getEndpoints, getLatestMessages } from './lib/catalog';

// A producer defines a message, so it should always document the version it actually sends.
// If a message gets a new version and its producer still pins the old one, the catalog
// contradicts itself: the new version has no producer and the old one looks current.
export default defineFitnessFunction({
  id: 'producers-send-latest-message-version',
  name: 'Producers send the latest version of their messages',
  severity: 'error',

  async run({ catalog }) {
    const [messages, endpoints] = await Promise.all([getLatestMessages(catalog), getEndpoints(catalog)]);

    return endpoints.flatMap((endpoint) =>
      findOutdatedPins(endpoint.sends, messages).map(({ pinned, message }) => ({
        message: `${endpoint.name} sends ${message.name} ${pinned}, but the latest version is ${message.version}`,
        resources: [
          { type: endpoint.type, id: endpoint.id, version: endpoint.version },
          { type: message.type, id: message.id, version: message.version },
        ],
        suggestion: `Update ${endpoint.name}'s sends entry for ${message.id} to ${message.version}, or use version: latest.`,
      }))
    );
  },
});
