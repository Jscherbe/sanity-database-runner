# `@ulu/sanity-runner`

[![npm version](https://img.shields.io/npm/v/@ulu/sanity-runner.svg)](https://www.npmjs.com/package/@ulu/sanity-runner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI tool for running database update scripts against a Sanity.io dataset.

This utility provides a safe and structured way to run database update scripts—small, version-controlled files that perform bulk data changes on your Sanity.io dataset. For example, you might need to add a new field to hundreds of documents at once, or rename a field across your entire dataset. ([Why Use an Update Script?](#why-use-an-update-script))

As a safety measure, the runner automatically creates a backup before any changes are made.

## Features

-   **CLI Interface:** Run scripts explicitly by name or select from a list.
-   **Interactive Mode:** Don't remember the script name? Run the command without arguments to pick from a list of available scripts.
-   **Automatic Safety Backups:** Creates a `.tar.gz` backup of your dataset before each run, so you can always restore if something goes wrong.
-   **Configurable:** All paths and the Sanity client are configured in your project, not in the tool.
-   **Transactional Updates:** Mutations returned from your scripts are run inside a single transaction for safety.
-   **Dry Run Support:** (Coming Soon)

## Installation

```bash
npm install -D @ulu/sanity-runner @sanity/client
```

## Setup

### 1. Create a Configuration File

In the root of your project, create a file named `sanity-runner.config.js`. This file will configure the database runner.

A minimal configuration only requires the `dataset` and a Sanity `client` instance:

```javascript
// sanity-runner.config.js
import { createClient } from '@sanity/client';

export const config = {
  // The dataset is required for backups and logging.
  dataset: 'production',

  // You must provide an initialized client.
  client: createClient({
    projectId: 'your-project-id',
    dataset: 'production', // Should match the dataset above
    token: process.env.SANITY_WRITE_TOKEN, 
    apiVersion: '2024-05-01',
    useCdn: false
  })
};
```

#### Advanced Configuration

You can override the default paths and other settings.

```javascript
// sanity-runner.config.js
import { createClient } from '@sanity/client';

export const config = {
  dataset: 'production',
  client: createClient({ /* ... */ }),

  // Optional: A regex to find script files.
  // Defaults to /\.(js|mjs|cjs)$/
  extensions: /\.(js|ts)$/,

  // (Optional, default true) Disable backups for a specific run.
  backup: false,

  // The `paths` object is optional.
  paths: {
    // Optional: Define the project root. Defaults to `process.cwd()`.
    // All other paths are resolved relative to this.
    cwd: process.cwd(), 
    
    // Optional: Directory for your update scripts.
    // Defaults to 'database/updates'.
    updates: './db/my-updates',

    // Optional: Directory for your backup files.
    // Defaults to 'database/backups'.
    backups: './db/my-backups',

    // Optional: Provide a specific path to the sanity binary 
    // if auto-detection fails.
    sanityBin: '/path/to/your/sanity' 
  },
  
  
};
```

**Note on Path Resolution:**
- **Relative paths** (like `'./db/my-updates'`) are resolved relative to `paths.cwd`.
- **Absolute paths** (like `'/opt/sanity/backups'`) are used as-is, ignoring `paths.cwd`. This allows you to store scripts or backups anywhere on your filesystem.

### 2. Create your Update Scripts Directory

Based on the config above, create the `database/updates` directory. This is where you will place your individual migration scripts.

```
.
├── database/
│   ├── backups/
│   └── updates/
│       └── my-first-update.js
├── sanity-runner.config.js
└── package.json
```

## Usage

You can run the tool in two ways:

### 1. Explicit Mode (For Automation)

Provide the full name of your script file, including the extension, as a command-line argument. This is fast and ideal for use in other scripts or CI/CD pipelines.

```bash
npx sanity-runner my-first-update.js
```

### 2. Interactive Mode (For Convenience)

Run the command without any arguments. The tool will scan your `updates` directory and present you with a list of available scripts to choose from.

```bash
npx sanity-runner
```

The runner will then prompt you for confirmation before executing the selected script and creating a backup.

### Why Use an Update Script?

As your project grows, you'll often need to make changes to your data structure. For example, you might:

-   **Add a new field:** You've added a `category` field to your `post` documents and want to set a default value for all existing posts.
-   **Rename a field:** You've decided to rename a field from `authorName` to `author` and need to copy the data over for all documents.
-   **Restructure content:** You want to move content from a simple `string` field into a `block` (rich text) field.

Doing these kinds of changes manually across hundreds of documents is tedious and prone to errors. An update script automates this process. You define the logic for the change in a single file, and this tool runs it securely against your entire dataset.

### Creating an Update Script

Each file in your `updates` directory should be an ES module that exports an `async` function named `run`.

-   **`run(client)` function:**
    -   It receives the initialized Sanity client instance as its only argument.
    -   It should perform your desired logic (fetching data, transforming it, etc.).
    -   It must return an array of Sanity mutations.

#### Example Script

Here is an example of `database/updates/my-first-update.js`:

```javascript
// database/updates/my-first-update.js

/**
 * Adds a "migrated: true" flag to all documents of type "post".
 * @param {import('@sanity/client').SanityClient} client The initialized Sanity client.
 * @returns {Promise<Array<object>>} An array of mutations to be performed.
 */
export async function run(client) {
  console.log('Finding all "post" documents to migrate...');

  const postIds = await client.fetch(`*[_type == "post"]._id`);

  if (!postIds || postIds.length === 0) {
    console.log("No posts found. Nothing to do.");
    return [];
  }

  console.log(`Found ${postIds.length} posts. Preparing mutations...`);

  // Create a patch for each document
  const mutations = postIds.map(id => ({
    patch: {
      id: id,
      patch: {
        set: { migrated: true }
      }
    }
  }));

  return mutations;
}
```

## Available Mutations

The `run` function in your script can return an array of objects, where each object represents a mutation. The runner supports the following formats:

-   **Create or Replace:**
    ```javascript
    { createOrReplace: { _id: 'my-doc', _type: 'post', title: 'New Post' } }
    ```
-   **Patch:**
    ```javascript
    { patch: { id: 'my-doc-id', patch: { set: { title: 'Updated Title' } } } }
    ```
-   **Delete:**
    ```javascript
    { delete: { id: 'my-doc-id' } }
    ```

## License

MIT