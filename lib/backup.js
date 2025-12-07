import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs-extra";
import { log } from "./logger.js";

const execPromise = promisify(exec);

/**
 * Creates a backup of the production dataset.
 * @param {object} options - The backup options.
 * @param {string} options.backupsPath - The directory to save the backup file.
 * @param {string} options.sanityBinPath - The path to the sanity binary.
 * @param {string} options.dataset - The dataset to backup.
 */
export async function backup({ backupsPath, sanityBinPath, dataset, cwd }) {
  
  if (!fs.existsSync(backupsPath)) {
    log.warn(`Backup directory "${backupsPath}" doesn't exist. Creating it now.`);
    fs.ensureDirSync(backupsPath);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupsPath, `${dataset}-backup-${timestamp}.tar.gz`);
  // Explicitly use 'node' to execute the sanity binary. This helps prevent OS-level ambiguities
  // about how to execute the script, especially in mixed CJS/ESM environments where the 
  // running process is an ES module but the script being called is a CJS module.
  const command = `node "${sanityBinPath}" dataset export ${dataset} "${backupFile}"`;

  // Use the provided CWD for checks and execution, falling back to process.cwd()
  const rootDir = cwd || process.cwd();

  // Perform a soft check for a sanity config file to provide a better warning.
  const sanityConfigs = ["sanity.cli.js", "sanity.cli.ts", "sanity.config.js", "sanity.config.ts"];
  const hasConfig = sanityConfigs.some(file => fs.existsSync(path.join(rootDir, file)));

  if (!hasConfig) {
    log.warn(`Warning: No Sanity config file (e.g., "sanity.cli.js") found in "${rootDir}".`);
    log.warn("If the backup fails, this may be the reason. The 'sanity' command needs this file to identify the project.");
  }

  log.log("Starting database backup...");
  log.log(`Executing: ${command}`);
  log.log(`Running in directory: ${rootDir}`);

  try {
    const { stdout, stderr } = await execPromise(command, { cwd: rootDir });
    if (stdout) log.log("stdout:", stdout);
    if (stderr) log.error("stderr:", stderr);
    log.log(`Backup successful! File created at: ${backupFile}`);
  } catch (error) {
    log.error("Backup failed:", error);
    throw error; // Re-throw to stop the runner
  }
}
