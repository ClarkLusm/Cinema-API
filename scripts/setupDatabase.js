'use strict';

require('dotenv').config();

const { spawnSync } = require('child_process');
const path = require('path');

const createDatabase = require('./createDatabase');

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: ${path.basename(scriptPath)} ${args.join(' ')}`.trim());
  }
}

async function main() {
  const shouldReset = process.argv.includes('--reset');
  const sequelizeRunner = path.resolve(__dirname, 'runSequelizeCli.js');

  await createDatabase({ dropFirst: shouldReset });
  runNodeScript(sequelizeRunner, ['db:migrate']);
  runNodeScript(sequelizeRunner, ['db:seed:all']);
}

main().catch((error) => {
  console.error('Failed to set up database.');
  console.error(error.message);
  process.exit(1);
});
