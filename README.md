# `@ulu/sanity-database-runner`

[![npm version](https://img.shields.io/npm/v/@ulu/sanity-database-runner.svg)](https://www.npmjs.com/package/@ulu/sanity-database-runner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI tool to run scripts for backing up and migrating a Sanity.io database.

This utility provides a structured way to execute database update scripts against your Sanity dataset, with automatic backups and a clear, repeatable process.

## Features

-   **CLI Interface:** Run scripts from the command line with a simple command: `npx sanity-db-run <script-name>`.
-   **Automatic Backups:** Automatically creates a `.tar.gz` backup of your dataset before running any script.
-   **Configurable:** All paths and the Sanity client are configured in your project, not in the tool.
-   **Transactional Updates:** Mutations returned from your scripts are run inside a single transaction for safety.
-   **Dry Run Support:** (Coming Soon)

## Installation

```bash
npm install -D @ulu/sanity-database-runner @sanity/client
```

## Setup

### 1. Create a Configuration File

In the root of your project, create a file named `sanity-runner.config.js`. This file will configure the database runner.

```javascript
// sanity-runner.config.js
import { createClient } from '@sanity/client';

// Your project-specific configuration
const clientConfig = {
  projectId: 'your-project-id',
  dataset: 'your-dataset',
  token: process.env.SANITY_WRITE_TOKEN, // Make sure this is a write token
  apiVersion: '2024-05-01',
  useCdn: false,
};

export const config = {
  // You can pass a pre-initialized client...
  client: createClient(clientConfig),
  
  // ...or just the config object
  // client: clientConfig,

  // Paths are relative to your project root
  paths: {
    updates: './database/updates', // Directory where your update scripts live
    backups: './database/backups', // Directory where backups will be stored
    // (Optional) Provide a specific path to the sanity binary if auto-detection fails
    // sanityBin: '/path/to/your/sanity' 
  },
  
  // (Optional) Disable backups for a specific run
  // backup: false
};
```

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

### Running a Script

To run an update script, execute the `sanity-db-run` command from your project root, followed by the name of your script file (without the `.js` extension).

```bash
npx sanity-db-run my-first-update
```

The runner will prompt you for confirmation before executing the script and creating a backup.

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