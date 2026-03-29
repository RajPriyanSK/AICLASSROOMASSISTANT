import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Simple .env parser
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

// Set default PORT if not provided
if (!process.env.PORT) process.env.PORT = '5000';

console.log('--- Setting up Database ---');
try {
  execSync('pnpm --filter @workspace/db run push', { stdio: 'inherit', shell: true });
} catch (error) {
  console.error('Database push failed. Ensure your DATABASE_URL is correct.');
  process.exit(1);
}

console.log('--- Starting API Server and Classroom Frontend ---');

// Backend needs PORT=5000 and NODE_ENV=development
// Frontend will use default port (5173 or similar) and proxy /api to 5000
const apiProcess = spawn('npx', ['tsx', './src/index.ts'], {
  cwd: path.resolve(process.cwd(), 'artifacts/api-server'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '5000', NODE_ENV: 'development' }
});

const frontendProcess = spawn('pnpm', ['--filter', '@workspace/classroom', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '5173' } // Force frontend to 5173 to avoid conflict with backend on 5000
});

process.on('SIGINT', () => {
  apiProcess.kill();
  frontendProcess.kill();
  process.exit();
});
