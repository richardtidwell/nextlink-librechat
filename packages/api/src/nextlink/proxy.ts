import type { RequestHandler } from 'express';

/** Loopback integration for the single-user comparison deployment. */
export function createNextlinkProxy(options: {
  baseURL?: string;
  apiKey?: string;
}): RequestHandler {
  return async (req, res) => {
    if (!options.baseURL || !options.apiKey) {
      res.status(503).json({ message: 'Nextlink integration is not configured.' });
      return;
    }
    if (!/^\/[a-zA-Z0-9_-]{1,100}(?:\/(?:connectors|approval|permissions))?$/.test(req.path)) {
      res.status(404).json({ message: 'Unknown Nextlink action.' });
      return;
    }
    if (!req.user || !('id' in req.user) || typeof req.user.id !== 'string') {
      res.status(401).json({ message: 'Sign in to use Nextlink controls.' });
      return;
    }
    try {
      const response = await fetch(`${options.baseURL}/ui${req.path}`, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.apiKey}`,
          'X-Nextlink-User': req.user.id,
        },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
        signal: AbortSignal.timeout(15_000),
      });
      res.status(response.status).json(await response.json());
    } catch {
      res.status(502).json({ message: 'The Nextlink backend is unavailable. Try again.' });
    }
  };
}
