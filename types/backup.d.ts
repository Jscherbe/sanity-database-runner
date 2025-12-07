/**
 * Creates a backup of the production dataset.
 * @param {object} options - The backup options.
 * @param {string} options.backupsPath - The directory to save the backup file.
 * @param {string} options.sanityBinPath - The path to the sanity binary.
 * @param {string} options.dataset - The dataset to backup.
 */
export function backup({ backupsPath, sanityBinPath, dataset, cwd }: {
    backupsPath: string;
    sanityBinPath: string;
    dataset: string;
}): Promise<void>;
//# sourceMappingURL=backup.d.ts.map