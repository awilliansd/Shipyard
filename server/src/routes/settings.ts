import { FastifyInstance } from 'fastify';
import { getSettings } from '../services/settingsStore.js';
import { TASKS_DIR } from '../services/taskStore.js';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/api/settings', async () => {
    return { ...getSettings(), tasksDir: TASKS_DIR };
  });

  // List subdirectories of a given path (for folder browser)
  app.post<{ Body: { path: string } }>(
    '/api/browse',
    async (request, reply) => {
      const dirPath = request.body.path;
      try {
        const entries = await readdir(dirPath);
        const dirs: { name: string; path: string }[] = [];

        for (const entry of entries) {
          if (entry.startsWith('.') || entry === 'node_modules' || entry === '$Recycle.Bin' || entry === 'System Volume Information' || entry === 'lost+found') continue;
          const fullPath = join(dirPath, entry);
          try {
            const s = await stat(fullPath);
            if (s.isDirectory()) {
              dirs.push({ name: entry, path: fullPath });
            }
          } catch {}
        }

        dirs.sort((a, b) => a.name.localeCompare(b.name));
        return { directories: dirs };
      } catch (err: any) {
        return reply.status(400).send({ error: `Cannot read directory: ${err.message}` });
      }
    }
  );
}
