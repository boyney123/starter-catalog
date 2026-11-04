import { defineFitnessFunction } from '@eventcatalog/fitness';

// This catalog models every service inside a system (domain → system → service). A service
// that no system lists has been added outside that structure and won't appear in any system's
// architecture view.
export default defineFitnessFunction({
  id: 'services-belong-to-a-system',
  name: 'Every service belongs to a system',
  severity: 'error',

  async run({ catalog }) {
    const [systems, services] = await Promise.all([
      catalog.getSystems({ latestOnly: true }),
      catalog.getServices({ latestOnly: true }),
    ]);

    const listed = new Set((systems ?? []).flatMap((system) => (system.services ?? []).map((service) => service.id)));

    return (services ?? [])
      .filter((service) => !listed.has(service.id))
      .map((service) => ({
        message: `${service.name} is not listed in any system's services`,
        resources: [{ type: 'service', id: service.id, version: service.version }],
        suggestion: "Add the service to its system's services list, inside that system's folder.",
      }));
  },
});
