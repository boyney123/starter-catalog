import { defineFitnessFunction } from '@eventcatalog/fitness';
import { getEndpoints, getLatestMessages } from './lib/catalog';

// An event is a fact owned by the service that publishes it. Two producers for the same event
// means two owners for one contract, and nobody knows who may change it.
export default defineFitnessFunction({
  id: 'events-have-a-single-producer',
  name: 'Every event has a single producer',
  severity: 'error',

  async run({ catalog }) {
    const [messages, endpoints] = await Promise.all([getLatestMessages(catalog), getEndpoints(catalog)]);

    return [...messages.values()]
      .filter((message) => message.type === 'event')
      .flatMap((event) => {
        const producers = endpoints.filter((endpoint) => endpoint.sends.some((pointer) => pointer.id === event.id));
        if (producers.length < 2) return [];
        return [
          {
            message: `${event.name} is sent by ${producers.length} producers: ${producers.map((p) => p.name).join(', ')}`,
            resources: [
              { type: 'event', id: event.id, version: event.version },
              ...producers.map((p) => ({ type: p.type, id: p.id, version: p.version })),
            ],
            suggestion: 'Give the event one owning producer, or split it into separate events.',
          },
        ];
      });
  },
});
