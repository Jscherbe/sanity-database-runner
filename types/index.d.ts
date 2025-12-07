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
 * @param {string} [config.paths.cwd] - Optional path to the project root, for running sanity commands. Defaults to process.cwd().
 * @param {string} [config.paths.sanityBin] - Optional path to the sanity binary.
 * @param {boolean} [config.backup=true] - Whether to perform a backup before running a script.
 * @param {boolean} [config.force=false] - If true, skips the confirmation prompt.
 * @returns {DatabaseRunner}
 */
export function createDatabaseRunner(config: {
    client: SanityClient;
    dataset: string;
    paths: {
        updates: string;
        backups: string;
        cwd?: string;
        sanityBin?: string;
    };
    backup?: boolean;
    force?: boolean;
}): DatabaseRunner;
export type SanityClient = import("@sanity/client").SanityClient;
export type DatabaseRunner = {
    /**
     * - Executes a database script.
     */
    run: (scriptName: string) => Promise<void>;
};
//# sourceMappingURL=index.d.ts.map