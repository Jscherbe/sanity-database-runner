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
export async function backup({ backupsPath, sanityBinPath, dataset }) {
  
  if (!fs.existsSync(backupsPath)) {
    log.warn(`Backup directory "${backupsPath}" doesn't exist. Creating it now.`);
    fs.ensureDirSync(backupsPath);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupsPath, `${dataset}-backup-${timestamp}.tar.gz`);
  const command = `"${sanityBinPath}" dataset export ${dataset} "${backupFile}"`;

  log.log("Starting database backup...");
  log.log(`Executing: ${command}`);

  try {
    const { stdout, stderr } = await execPromise(command);
    if (stdout) log.log("stdout:", stdout);
    if (stderr) log.error("stderr:", stderr);
    log.log(`Backup successful! File created at: ${backupFile}`);
  } catch (error) {
    log.error("Backup failed:", error);
    throw error; // Re-throw to stop the runner
  }
}
