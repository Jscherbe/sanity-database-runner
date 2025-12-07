#!/usr/bin/env node

import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import prompts from 'prompts';
import { createDatabaseRunner } from '../lib/index.js';
import { log } from '../lib/logger.js';
import { createClient } from '@sanity/client';

async function main() {
  let scriptName = process.argv[2];
  const configName = process.argv[3] || 'sanity-runner.config.js';
  const configPath = path.resolve(process.cwd(), configName);

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
    if (!config.dataset) {
      log.error('Error: The configuration file must export a "config" object with a "dataset" property.');
      process.exit(1);
    }

    // If no script name is provided, enter interactive mode
    if (!scriptName) {
      const updateScripts = (await fs.readdir(config.paths.updates))
        .filter(file => file.endsWith('.js'))
        .map(file => ({
          title: file,
          value: file.replace('.js', '')
        }));

      if (updateScripts.length === 0) {
        log.error(`Error: No update scripts found in "${config.paths.updates}".`);
        process.exit(1);
      }

      const response = await prompts({
        type: 'select',
        name: 'script',
        message: 'Which update script would you like to run?',
        choices: updateScripts
      });

      if (!response.script) {
        log.log("Operation cancelled by user.");
        process.exit(0);
      }
      scriptName = response.script;
    }
    
    let client;
    if (typeof config.client === 'function') {
      log.error('Error: config.client cannot be the createClient function itself. It must be a client instance or a config object.');
      process.exit(1);
    } else if (config.client.constructor === Object) {
      // If client is a plain object, create a client instance,
      // ensuring the top-level dataset is prioritized.
      client = createClient({
        ...config.client,
        dataset: config.dataset
      });
    } else {
      // Assume it's a valid, pre-initialized client instance
      client = config.client;
    }
      
    const runner = createDatabaseRunner({
      ...config,
      client,
    });

    await runner.run(scriptName);
    
  } catch (err) {
    log.error('Failed to run database runner:');
    log.error(err);
    process.exit(1);
  }
}

main();
