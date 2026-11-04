import { defineFitnessFunction } from '@eventcatalog/fitness';
import { findOutdatedPins, getEndpoints, getLatestMessages } from './lib/catalog';

// Consumers can legitimately lag behind a new message version while they migrate, so this is a
// warning, not an error: it lists who still has to move after a message changes.
export default defineFitnessFunction({
  id: 'consumers-receive-latest-message-version',
  name: 'Consumers receive the latest version of their messages',
  severity: 'warning',

  async run({ catalog }) {
    const [messages, endpoints] = await Promise.all([getLatestMessages(catalog), getEndpoints(catalog)]);

    return endpoints.flatMap((endpoint) =>
      findOutdatedPins(endpoint.receives, messages).map(({ pinned, message }) => ({
        message: `${endpoint.name} receives ${message.name} ${pinned}, but the latest version is ${message.version}`,
        resources: [
          { type: endpoint.type, id: endpoint.id, version: endpoint.version },
          { type: message.type, id: message.id, version: message.version },
        ],
        suggestion: `Once ${endpoint.name} handles ${message.version}, update its receives entry for ${message.id}.`,
      }))
    );
  },
});
