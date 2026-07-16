import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve('src/server/db/schema.sql');
const destination = path.resolve('dist/server/src/server/db/schema.sql');
await mkdir(path.dirname(destination), { recursive: true });
await copyFile(source, destination);
