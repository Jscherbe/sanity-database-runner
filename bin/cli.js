#!/usr/bin/env node

import path from 'path';
import { existsSync } from 'fs';
import { createDatabaseRunner } from '../lib/index.js';
import { log } from '../lib/logger.js';
import { createClient } from '@sanity/client';

async function main() {
  const scriptName = process.argv[2];
  const configName = process.argv[3] || 'sanity-runner.config.js';
  const configPath = path.resolve(process.cwd(), configName);

  if (!scriptName) {
    log.error('Error: No script name provided.');
    log.error('Usage: sanity-db-run <script-name>');
    process.exit(1);
  }

  if (!existsSync(configPath)) {
    log.error(`Error: Configuration file not found at "${configPath}"`);
    log.error('Please create a sanity-runner.config.js file in your project root.');
    process.exit(1);
  }

  try {
    const { config } = await import(configPath);

    if (!config || !config.client) {
      log.error('Error: The configuration file must export a "config" object with a "client" property.');
      process.exit(1);
    }
    
    // The user can provide a client instance directly or a config object
    const client = config.client.constructor.name === 'SanityClient' 
      ? config.client 
      : createClient(config.client);

    const runner = createDatabaseRunner({
      client,
      ...config
    });

    await runner.run(scriptName);
    
  } catch (err) {
    log.error('Failed to run database runner:');
    log.error(err);
    process.exit(1);
  }
}

main();
