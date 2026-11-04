import { defineFitnessFunction } from '@eventcatalog/fitness';
import { getEndpoints, getLatestMessages } from './lib/catalog';

// A command asks one service to do something. If two services handle the same command, the
// work happens twice or the two race; either way the command no longer has a clear owner.
export default defineFitnessFunction({
  id: 'commands-have-a-single-handler',
  name: 'Every command has a single handler',
  severity: 'error',

  async run({ catalog }) {
    const [messages, endpoints] = await Promise.all([getLatestMessages(catalog), getEndpoints(catalog)]);

    return [...messages.values()]
      .filter((message) => message.type === 'command')
      .flatMap((command) => {
        const handlers = endpoints.filter((endpoint) => endpoint.receives.some((pointer) => pointer.id === command.id));
        if (handlers.length < 2) return [];
        return [
          {
            message: `${command.name} is handled by ${handlers.length} services: ${handlers.map((h) => h.name).join(', ')}`,
            resources: [
              { type: 'command', id: command.id, version: command.version },
              ...handlers.map((h) => ({ type: h.type, id: h.id, version: h.version })),
            ],
            suggestion: 'Route the command to one handler, or publish an event that several services can react to.',
          },
        ];
      });
  },
});
