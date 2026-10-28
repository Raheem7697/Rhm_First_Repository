import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = normalize(pathname === '/' ? 'index.html' : pathname.slice(1));
    if (relative.startsWith('..')) throw new Error('Invalid path');
    const data = await readFile(join(root, relative));
    response.writeHead(200, { 'Content-Type': `${types[extname(relative)] ?? 'application/octet-stream'}; charset=utf-8` });
    response.end(data);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});
server.listen(4173, '0.0.0.0', () => console.log('Orbit Pop running at http://localhost:4173'));
