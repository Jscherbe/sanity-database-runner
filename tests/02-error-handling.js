// database-runner/tests/02-error-handling.js
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@sanity/client";
import { createDatabaseRunner } from "../lib/index.js";
import { getUrlDirname } from "@ulu/utils/node/path.js";

const __dirname = getUrlDirname(import.meta.url);

console.log("--- Starting Test: 02-error-handling.js ---");

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Create a client with an invalid Project ID to force an error
const badClient = createClient({
  projectId: "null", // Invalid project ID
  dataset: process.env.SANITY_STUDIO_DATASET,
  apiVersion: "2024-05-01",
  useCdn: false,
});

async function main() {
  console.log("-> Initializing runner with bad config to test error handling...");
  
  // Suppress console.error for this test to keep output clean
  const originalError = console.error;
  console.error = () => {};

  // Spy on process.exit to see if it's called
  let exitCalled = false;
  const originalExit = process.exit;
  process.exit = () => { exitCalled = true; };

  try {
    const runner = createDatabaseRunner({
      client: badClient,
      dataset: process.env.SANITY_STUDIO_DATASET,
      paths: {
        updates: path.resolve(__dirname, "updates"),
        backups: path.resolve(__dirname, ".backups"),
      },
      force: true,
      backup: false, // No need to test backup here
    });

    await runner.run("simple-update");

  } catch (error) {
    // We don't expect an error to be thrown from the runner itself,
    // as it's designed to catch them and call process.exit.
  } finally {
    // Restore original functions
    console.error = originalError;
    process.exit = originalExit;
  }

  if (exitCalled) {
    console.log("-> SUCCESS: Runner exited as expected when an error occurred.");
    console.log("\n--- Test PASSED: 02-error-handling.js ---");
  } else {
    console.error("\n--- Test FAILED: 02-error-handling.js ---");
    console.error("-> Runner did not exit after encountering a client error.");
    process.exit(1);
  }
}

main();
