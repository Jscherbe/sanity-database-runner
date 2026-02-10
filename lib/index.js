import path from "path";
import fs from "fs/promises";
import prompts from "prompts";
import which from "which";
import { backup } from "./backup.js";
import { log } from "./logger.js";

/**
 * @typedef {import('@sanity/client').SanityClient} SanityClient
 */

/**
 * @typedef {object} DatabaseRunner
 * @property {(scriptName: string) => Promise<void>} run - Executes a database script.
 * @property {() => Promise<string[]>} getAvailableScripts - Returns a list of available update script filenames.
 */

const defaultConfig = {
  paths: {
    updates: "database/updates",
    backups: "database/backups",
    cwd: process.cwd(),
  },
  extensions: /\.(js|mjs|cjs)$/
};

/**
 * Creates a database runner instance.
 * @param {object} config - The configuration object.
 * @param {SanityClient} config.client - An initialized Sanity client with write permissions.
 * @param {string} config.dataset - The name of the dataset to run scripts against.
 * @param {object} [config.paths] - Optional paths for the runner to use.
 * @param {string} [config.paths.updates] - Path to the directory containing update scripts.
 * @param {string} [config.paths.backups] - Path to the directory where backups will be stored.
 * @param {string} [config.paths.cwd] - Optional path to the project root. Defaults to process.cwd().
 * @param {string} [config.paths.sanityBin] - Optional path to the sanity binary.
 * @param {RegExp} [config.extensions] - Regex for matching script extensions.
 * @param {boolean} [config.backup=true] - Whether to perform a backup before running a script.
 * @param {boolean} [config.force=false] - If true, skips the confirmation prompt.
 * @returns {DatabaseRunner}
 */
export function createDatabaseRunner(userConfig) {

  // Merge default and user-configured options
  const config = { 
    ...defaultConfig, 
    ...userConfig,
    paths: { ...defaultConfig.paths, ...userConfig.paths }
  };

  const { client, dataset, backup: performBackup = true, force = false, extensions: scriptExtensionRegex } = config;

  // Resolve all paths relative to the CWD
  const rootDir = config.paths.cwd;
  const resolvedPaths = {
    updates: path.resolve(rootDir, config.paths.updates),
    backups: path.resolve(rootDir, config.paths.backups),
    sanityBin: config.paths.sanityBin // This is resolved later by `which` if not provided
  };

  if (!client) {
    throw new Error("Database runner requires a `client` instance in config.");
  }
  if (!dataset) {
    throw new Error("Database runner requires a `dataset` property in config.");
  }

  /**
   * Executes a database update script.
   * @param {string} scriptName - The full name of the script file (including extension).
   */
  async function run(scriptName) {
    if (!scriptName) {
      log.error("Please provide the name of the update script to run.");
      log.error("Example: sanity-runner my-update-script.js");
      process.exit(1);
    }
    
    log.log("Sanity Database Runner");
    log.log("--------------------------------------------------");
    log.log(`Root directory:    ${rootDir}`);
    log.log(`Updates directory: ${resolvedPaths.updates}`);
    log.log(`Backups directory: ${resolvedPaths.backups}`);
    log.log("--------------------------------------------------");
    log.log(`Preparing to run update script: "${scriptName}"`);

    if (!force) {
      // Confirm with the user
      const response = await prompts({
        type: "confirm",
        name: "value",
        message: `Are you sure you want to run the script "${ scriptName }" on the "${ dataset }" dataset?`,
        initial: false
      });

      if (!response.value) {
        log.log("Operation cancelled by user.");
        return;
      }
    }

    try {
      if (performBackup) {
        // 1. Check for a user-defined path first.
        let sanityBinPath = resolvedPaths.sanityBin;

        // 2. If not found, try to auto-detect it.
        if (!sanityBinPath) {
          sanityBinPath = which.sync("sanity", { nothrow: true });
        }

        // 3. If it's still not found, exit with an error.
        if (!sanityBinPath) {
          log.error("Error: Could not find the 'sanity' command.");
          log.error("Please make sure @sanity/cli is installed, or specify the path manually in your config under 'paths.sanityBin'.");
          process.exit(1);
        }
        
        await backup({
          backupsPath: resolvedPaths.backups,
          sanityBinPath: sanityBinPath,
          dataset: dataset,
          cwd: rootDir,
        });
      } else {
        log.warn("Skipping backup as per configuration.");
      }
    } catch (error) {
      // The backup() function already logs the detailed error.
      // We just need to stop the script from progressing.
      log.error("Halting execution due to backup failure.");
      process.exit(1);
    }

    const scriptPath = path.join(resolvedPaths.updates, scriptName);

    try {
      const { run: runScript } = await import(scriptPath);
      const mutations = await runScript(client);

      if (!mutations || mutations.length === 0) {
        log.log("Script returned no mutations to perform.");
        return;
      }

      log.log(`Executing ${ mutations.length } mutations...`);

      const transaction = client.transaction();
      mutations.forEach(mutation => {
        if (mutation.createOrReplace) {
          transaction.createOrReplace(mutation.createOrReplace);
        } else if (mutation.patch) {
          transaction.patch(mutation.patch.id, mutation.patch.patch);
        } else if (mutation.delete) {
          transaction.delete(mutation.delete.id);
        }
      });

      await transaction.commit();
      log.log("Successfully committed all changes!");

    } catch (error) {
      if (error.code === "ERR_MODULE_NOT_FOUND") {
        log.error(`Error: Update script "${scriptName}" not found.`);
        log.error(`Looked for script at: ${scriptPath}`);
      } else {
        log.error("An error occurred while running the update script:", error);
      }
      process.exit(1);
    }
  }

  /**
   * Returns a list of available update scripts.
   * @returns {Promise<string[]>}
   */
  async function getAvailableScripts() {
    try {
      const files = await fs.readdir(resolvedPaths.updates);
      return files.filter(file => scriptExtensionRegex.test(file));
    } catch (error) {
      if (error.code === "ENOENT") {
        log.error(`Error: Updates directory not found at "${ resolvedPaths.updates }".`);
        process.exit(1);
      }
      throw error;
    }
  }

  return { run, getAvailableScripts };
}