import Fastify from 'fastify';
import cors from '@fastify/cors';
import { projectRoutes } from './routes/projects.js';
import { taskRoutes } from './routes/tasks.js';
import { gitRoutes } from './routes/git.js';
import { terminalRoutes } from './routes/terminals.js';
import { settingsRoutes } from './routes/settings.js';
import { initProjectDiscovery } from './services/projectDiscovery.js';
import { loadSettings } from './services/settingsStore.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ['http://localhost:5421'],
});

await app.register(projectRoutes);
await app.register(taskRoutes);
await app.register(gitRoutes);
await app.register(terminalRoutes);
await app.register(settingsRoutes);

await loadSettings();
await initProjectDiscovery();

try {
  await app.listen({ port: 5420, host: '0.0.0.0' });
  console.log('DevDash server running on http://localhost:5420');
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
