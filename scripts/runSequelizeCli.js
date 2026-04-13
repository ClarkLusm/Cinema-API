'use strict';

require('dotenv').config();

const { spawnSync } = require('child_process');

const cliEntry = require.resolve('sequelize-cli/lib/sequelize');
const cliArgs = process.argv.slice(2);

if (cliArgs.length === 0) {
  console.error('Missing sequelize-cli arguments.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [cliEntry, ...cliArgs], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
