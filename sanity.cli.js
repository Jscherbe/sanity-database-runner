// sanity.cli.js
import { defineCliConfig } from "sanity/cli";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// This file is for the testing environment
// Don't throw an error if env vars are missing, as some tests might not require them.
// The backup process itself will fail with a clear message if needed.
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET,
    token: process.env.SANITY_STUDIO_API_TOKEN,
  },
});
