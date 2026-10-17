import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Resolve storage relative to this file, never to process.cwd(). This prevents
// the root command and backend command from accidentally using different DBs.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.resolve(__dirname, '../data/db.json');
const defaults = { users: [], profiles: {}, chats: {}, reports: [] };

function ensure() {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(defaults, null, 2));
  }
}
export function readDb() {
  ensure();
  const db = JSON.parse(fs.readFileSync(file, 'utf8'));
  db.users ||= []; db.profiles ||= {}; db.chats ||= {}; db.reports ||= [];
  return db;
}
export function writeDb(db) {
  ensure();
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2));
  fs.renameSync(temp, file);
}
export function id() { return crypto.randomUUID(); }
