import express, { type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

import authHandler from './netlify/functions/auth';
import changeSeatHandler from './netlify/functions/changeSeat';
import getLayoutsHandler from './netlify/functions/getLayouts';
import saveLayoutsHandler from './netlify/functions/saveLayouts';
import getSeatHistoryHandler from './netlify/functions/getSeatHistory';
import saveSeatHandler from './netlify/functions/saveSeat';
import getSettingsHandler from './netlify/functions/getSettings';
import saveSettingsHandler from './netlify/functions/saveSettings';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

const functionHandlers: Record<string, (req: Request) => Promise<Response>> = {
  auth: authHandler,
  changeSeat: changeSeatHandler,
  getLayouts: getLayoutsHandler,
  saveLayouts: saveLayoutsHandler,
  getSeatHistory: getSeatHistoryHandler,
  saveSeat: saveSeatHandler,
  getSettings: getSettingsHandler,
  saveSettings: saveSettingsHandler,
};

async function handleFunction(fnName: string, req: ExpressRequest, res: ExpressResponse) {
  const handler = functionHandlers[fnName];
  if (!handler) {
    res.status(404).json({ error: `Function ${fnName} not found` });
    return;
  }

  try {
    const url = new URL(req.originalUrl, `http://${req.headers.host || 'localhost'}`).toString();
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() === 'host' || key.toLowerCase() === 'content-length') continue;
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    const init: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
      init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const standardReq = new Request(url, init);
    const standardRes = await handler(standardReq);

    res.status(standardRes.status);
    standardRes.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    const responseBody = await standardRes.text();
    res.send(responseBody);
  } catch (error) {
    console.error(`Error handling function ${fnName}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

app.all('/.netlify/functions/:name', (req, res) => {
  handleFunction(req.params.name, req, res);
});

app.all('/api/:name', (req, res) => {
  handleFunction(req.params.name, req, res);
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
