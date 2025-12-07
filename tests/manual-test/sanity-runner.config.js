// database-runner/tests/manual-test/sanity-runner.config.js
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@sanity/client";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from the root .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

export const config = {
  dataset: process.env.SANITY_STUDIO_DATASET,
  client: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    token: process.env.SANITY_STUDIO_API_TOKEN,
    apiVersion: "2024-05-01",
    useCdn: false,
  },
  paths: {
    cwd: __dirname,
    updates: path.resolve(__dirname, "updates"),
    backups: path.resolve(__dirname, ".backups"),
  },
};
