// database-runner/tests/index.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@sanity/client';
import { createDatabaseRunner } from '../lib/index.js';
import { backup } from '../lib/backup.js';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Mock dependencies that are not the Sanity client
vi.mock('../lib/backup.js');
vi.mock('prompts', () => ({
  default: vi.fn(() => Promise.resolve({ value: true }))
}));

// Real Sanity Client for testing
const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET,
  token: process.env.SANITY_STUDIO_API_TOKEN,
  apiVersion: '2024-05-01',
  useCdn: false,
});

// Helper to delete all test documents
const cleanup = async () => {
  const ids = await client.fetch(`*[_type in ["post", "author"]]._id`);
  if (ids.length > 0) {
    await ids.reduce(
      (tx, id) => tx.delete(id),
      client.transaction()
    ).commit();
  }
};

describe('createDatabaseRunner() with Real Database', () => {
  let testPostId;

  // Clean the database before each test
  beforeEach(async () => {
    await cleanup();
    // Seed the database with a test post
    const testPost = await client.create({
      _type: 'post',
      title: 'A Test Post',
      slug: { _type: 'slug', current: 'a-test-post' },
    });
    testPostId = testPost._id;
  });

  // Clean the database after all tests
  afterEach(async () => {
    await cleanup();
  });

  it('should run a script and apply mutations to the real database', async () => {
    const runner = createDatabaseRunner({
      client,
      paths: {
        updates: path.resolve(__dirname, './fixtures/updates'),
        backups: path.resolve(__dirname, './fixtures/.backups'),
      },
      backup: false, // Don't run physical backup during tests
    });

    await runner.run('simple-update');

    // Fetch the document back from the database to verify the change
    const updatedPost = await client.getDocument(testPostId);

    expect(updatedPost.migrated).toBe(true);
  }, 15000); // Increase timeout for real network calls

  it('should exit gracefully if a script returns no mutations', async () => {
    // Delete the post so the script finds nothing
    await cleanup();

    const runner = createDatabaseRunner({
      client,
      paths: {
        updates: path.resolve(__dirname, './fixtures/updates'),
        backups: path.resolve(__dirname, './fixtures/.backups'),
      },
      backup: false,
    });
    
    // Spy on the commit method
    const commitSpy = vi.spyOn(client.transaction(), 'commit');
    
    await runner.run('simple-update');

    // The transaction should not have been committed
    expect(commitSpy).not.toHaveBeenCalled();
  }, 15000);
});
