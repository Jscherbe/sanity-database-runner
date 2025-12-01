// database-runner/tests/fixtures/config/sanity-runner.config.js
import path from "path";

export const config = {
  client: {
    projectId: 'test-project-id',
    dataset: 'test-dataset',
    token: 'test-token',
    apiVersion: '2024-05-01',
    useCdn: false,
  },
  paths: {
    updates: path.resolve(__dirname, '../updates'),
    backups: path.resolve(__dirname, '../.backups'),
  },
  backup: true
};
