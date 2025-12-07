// database-runner/tests/01-happy-path.js
import path from "path";
import fs from "fs-extra";
import dotenv from "dotenv";
import { createClient } from "@sanity/client";
import { createDatabaseRunner } from "../lib/index.js";
import { getUrlDirname } from "@ulu/utils/node/path.js";

const __dirname = getUrlDirname(import.meta.url);

// --- Setup ---
console.log("--- Starting Test: 01-happy-path.js ---");

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Real Sanity Client for testing
const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET,
  token: process.env.SANITY_STUDIO_API_TOKEN,
  apiVersion: "2024-05-01",
  useCdn: false,
});

const backupsDir = path.resolve(__dirname, ".backups");

// --- Helper Functions ---

const cleanup = async () => {
  console.log("-> Cleaning up database and filesystem...");
  // Delete test documents
  const ids = await client.fetch(`*[_type in ["post", "author"]]._id`);
  if (ids.length > 0) {
    await ids.reduce((tx, id) => tx.delete(id), client.transaction()).commit();
    console.log(`-> Deleted ${ids.length} documents.`);
  }
  // Delete backup directory
  if (fs.existsSync(backupsDir)) {
    fs.rmSync(backupsDir, { recursive: true, force: true });
    console.log("-> Deleted backup directory.");
  }
};

const seed = async () => {
  console.log("-> Seeding database with 1 test post...");
  const post = await client.create({
    _type: "post",
    title: "Test Post",
    slug: { _type: "slug", current: `test-post-${Date.now()}` },
  });
  console.log(`-> Created post with ID: ${post._id}`);
  return post._id;
};

const verify = async (postId) => {
  console.log("-> Verifying results...");

  // 1. Verify database change
  const updatedPost = await client.getDocument(postId);
  if (!updatedPost.migrated) {
    throw new Error(`Verification failed: Post ${postId} was not migrated.`);
  }
  console.log("-> SUCCESS: Database document was updated correctly.");

  // 2. Verify backup file was created
  const backupFiles = fs.readdirSync(backupsDir);
  if (backupFiles.length !== 1 || !backupFiles[0].endsWith(".tar.gz")) {
    throw new Error("Verification failed: Backup file was not created.");
  }
  console.log("-> SUCCESS: Backup file was created.");
};

// --- Main Test Execution ---

async function main() {
  let postId;
  try {
    await cleanup();
    postId = await seed();

    console.log("-> Initializing and running the database runner...");
    const runner = createDatabaseRunner({
      client,
      dataset: process.env.SANITY_STUDIO_DATASET,
      paths: {
        updates: path.resolve(__dirname, "updates"),
        backups: backupsDir,
      },
      force: true, // Bypass interactive prompt
    });

    await runner.run("simple-update");

    await verify(postId);

    console.log("\n--- Test PASSED: 01-happy-path.js ---");
  } catch (error) {
    console.error("\n--- Test FAILED: 01-happy-path.js ---");
    console.error(error);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

main();
