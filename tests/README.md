# Testing `@ulu/sanity-database-runner`

This directory contains simple, executable Node.js scripts for testing the database runner against a real Sanity.io dataset.

## Quick Start

1.  **Configure Environment**
    Create a `.env.local` file in the project's root directory (`database-runner/`). Add the credentials for a dedicated **test** project.
    
    ```ini
    # .env.local
    SANITY_STUDIO_PROJECT_ID="your-test-project-id"
    SANITY_STUDIO_DATASET="your-test-dataset"
    SANITY_STUDIO_API_TOKEN="your-write-token"
    ```

2.  **Run Automated Tests**
    This is the primary way to test the library. It runs a full backup and migration, and cleans up after itself.
    ```bash
    npm test
    ```

## Test Scripts

### Automated Tests (`npm test`)

The `npm test` command executes the following scripts in sequence:

*   `01-happy-path.js`: Performs a full end-to-end test.
    -   Cleans the database and filesystem.
    -   Seeds the database with a test document.
    -   Runs the database runner with backup enabled.
    -   Verifies that the document was migrated and a backup file was created.
    -   Cleans up all created documents and files.
*   `02-error-handling.js`:
    -   Tests the runner's ability to handle errors from the Sanity client by providing an invalid configuration.
    -   Verifies that the process exits gracefully.

### Manual CLI Test

This test provides a way to manually validate the full, real-world CLI experience, including interactive prompts. It uses `yalc` to simulate installing `@ulu/sanity-database-runner` in a separate project.

**Prerequisite**: Install `yalc` globally if you haven't already.
```bash
npm install -g yalc
```

**Setup and Execution**:

1.  **Publish to yalc**: From the `database-runner` root directory, publish the package to your local `yalc` store.
    ```bash
    yalc publish
    ```

2.  **Navigate to Test Project**:
    ```bash
    cd tests/manual-test
    ```

3.  **Link the Package**: Add the package from your `yalc` store.
    ```bash
    yalc add @ulu/sanity-database-runner
    ```

4.  **Install Dependencies**:
    ```bash
    npm install
    ```

5.  **Run the CLI**: Now you can run the tool's CLI command directly. It will use the `sanity-runner.config.js` in this directory and will be fully interactive.
    ```bash
    npx sanity-db-run manual-update
    ```
    You will be prompted to confirm the action. After you confirm, you can inspect the database and the `tests/manual-test/.backups` directory to see the results.

**Cleanup**: To remove the documents created by the manual test, run the automated test suite from the root directory:
```bash
# from database-runner/
npm test
```
