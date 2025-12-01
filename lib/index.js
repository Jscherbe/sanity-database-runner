import path from "path";
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
 */

/**
 * Creates a database runner instance.
 * @param {object} config - The configuration object.
 * @param {SanityClient} config.client - An initialized Sanity client with write permissions.
 * @param {string} config.dataset - The name of the dataset to run scripts against.
 * @param {object} config.paths - Paths for the runner to use.
 * @param {string} config.paths.updates - Path to the directory containing update scripts.
 * @param {string} config.paths.backups - Path to the directory where backups will be stored.
 * @param {string} [config.paths.sanityBin] - Optional path to the sanity binary.
 * @param {boolean} [config.backup=true] - Whether to perform a backup before running a script.
 * @param {boolean} [config.force=false] - If true, skips the confirmation prompt.
 * @returns {DatabaseRunner}
 */
export function createDatabaseRunner(config) {

  // The runner requires a `dataset` string separate from the client instance.
  // This is because the modern Sanity client does not reliably expose the dataset 
  // it was configured with, but the runner needs this information for backups and logging.
  const { client, dataset, paths, backup: performBackup = true, force = false } = config;

  if (!client) {
    throw new Error("Database runner requires a `client` instance in config.");
  }
  if (!dataset) {
    throw new Error("Database runner requires a `dataset` property in config.");
  }
  if (!paths || !paths.updates || !paths.backups) {
    throw new Error("Database runner requires `paths.updates` and `paths.backups` in config.");
  }

  /**
   * Executes a database update script.
   * @param {string} scriptName - The name of the script file (without .js extension).
   */
  async function run(scriptName) {
    if (!scriptName) {
      log.error("Please provide the name of the update script to run.");
      log.error("Example: sanity-db-run my-update-script");
      process.exit(1);
    }

    log.log(`Preparing to run update script: "${scriptName}"`);

    if (!force) {
      // Confirm with the user
      const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: `Are you sure you want to run the script "${scriptName}" on the "${dataset}" dataset?`,
        initial: false
      });

      if (!response.value) {
        log.log("Operation cancelled by user.");
        return;
      }
    }

    if (performBackup) {
      // 1. Check for a user-defined path first.
      let sanityBinPath = paths.sanityBin;

      // 2. If not found, try to auto-detect it.
      if (!sanityBinPath) {
        sanityBinPath = which.sync('sanity', { nothrow: true });
      }

      // 3. If it's still not found, exit with an error.
      if (!sanityBinPath) {
        log.error("Error: Could not find the 'sanity' command.");
        log.error("Please make sure @sanity/cli is installed, or specify the path manually in your config under 'paths.sanityBin'.");
        process.exit(1);
      }
      
      await backup({
        backupsPath: paths.backups,
        sanityBinPath: sanityBinPath,
        dataset: dataset
      });
    } else {
      log.warn("Skipping backup as per configuration.");
    }

    try {
      const { run: runScript } = await import(path.join(paths.updates, `${scriptName}.js`));
      const mutations = await runScript(client);

      if (!mutations || mutations.length === 0) {
        log.log("Script returned no mutations to perform.");
        return;
      }

      log.log(`Executing ${mutations.length} mutations...`);

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
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
          log.error(`Error: Update script "${scriptName}" not found at path "${path.join(paths.updates, `${scriptName}.js`)}".`);
      } else {
          log.error("An error occurred while running the update script:", error);
      }
      process.exit(1);
    }
  }

  return { run };
}