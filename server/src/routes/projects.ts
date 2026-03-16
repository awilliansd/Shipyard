import { FastifyInstance } from 'fastify';
import { getProjects, refreshProjects, updateProject, scanDirectory, addProjects, removeProject } from '../services/projectDiscovery.js';
import * as log from '../services/logService.js';

export async function projectRoutes(app: FastifyInstance) {
  app.get('/api/projects', async () => {
    const projects = await getProjects();
    return { projects };
  });

  app.post('/api/projects/refresh', async () => {
    const projects = await refreshProjects();
    return { projects };
  });

  app.patch<{ Params: { id: string }; Body: { name?: string; favorite?: boolean; lastOpenedAt?: string; externalLink?: string; notes?: string; links?: { label: string; url: string }[] } }>(
    '/api/projects/:id',
    async (request, reply) => {
      const { id } = request.params;
      const project = await updateProject(id, request.body);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      return project;
    }
  );

  // Scan a directory to discover projects (returns list, doesn't add them)
  app.post<{ Body: { directory: string } }>(
    '/api/projects/scan',
    async (request) => {
      try {
        const results = await scanDirectory(request.body.directory);
        log.info('server', `Scanned directory: found ${results.length} projects`, request.body.directory);
        return { projects: results };
      } catch (err: any) {
        log.error('server', 'Directory scan failed', `${request.body.directory}: ${err.message}`);
        throw err;
      }
    }
  );

  // Add selected project paths to the dashboard
  app.post<{ Body: { paths: string[] } }>(
    '/api/projects/add',
    async (request) => {
      try {
        const projects = await addProjects(request.body.paths);
        log.info('server', `Added ${request.body.paths.length} project(s)`, request.body.paths.join(', '));
        return { projects };
      } catch (err: any) {
        log.error('server', 'Failed to add projects', err.message);
        throw err;
      }
    }
  );

  // Remove a project from the dashboard
  app.post<{ Body: { path: string } }>(
    '/api/projects/remove',
    async (request) => {
      log.info('server', 'Project removed', request.body.path);
      const projects = await removeProject(request.body.path);
      return { projects };
    }
  );
}
