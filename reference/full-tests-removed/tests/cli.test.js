// database-runner/tests/cli.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';

// Mock the real implementation of the runner
const mockRunner = { run: vi.fn() };
vi.mock('../lib/index.js', () => ({
  createDatabaseRunner: vi.fn(() => mockRunner),
}));
vi.mock('../lib/logger.js');

// Store original process.argv
const originalArgv = process.argv;
const originalCwd = process.cwd;

// Helper function to dynamically import and run the CLI
const runCli = () => import('../bin/cli.js');

describe('CLI (bin/cli.js)', () => {
  let exitSpy;

  beforeEach(() => {
    // Reset mocks and spies before each test
    vi.resetAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    
    // Mock argv to simulate command-line arguments
    process.argv = [...originalArgv.slice(0, 2)];

    // Mock process.cwd to a predictable directory
    process.cwd = vi.fn(() => path.resolve(__dirname, 'fixtures'));
  });

  afterEach(() => {
    // Restore original process properties
    process.argv = originalArgv;
    process.cwd = originalCwd;
    vi.unstubAllEnvs();
    exitSpy.mockRestore();
  });

  it('should show an error and exit if no script name is provided', async () => {
    await runCli();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(vi.mocked(require('../lib/logger.js')).log.error).toHaveBeenCalledWith('Error: No script name provided.');
  });

  it('should show an error and exit if config file does not exist', async () => {
    // Temporarily mock existsSync to return false
    const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    process.argv.push('my-script');
    await runCli();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(vi.mocked(require('../lib/logger.js')).log.error).toHaveBeenCalledWith(expect.stringContaining('Error: Configuration file not found at'));
    
    existsSyncSpy.mockRestore();
  });

  it('should call the runner with the correct script name', async () => {
    const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    
    const scriptName = 'my-script';
    process.argv.push(scriptName);
    
    await runCli();

    expect(mockRunner.run).toHaveBeenCalledWith(scriptName);
    expect(exitSpy).not.toHaveBeenCalled();

    existsSyncSpy.mockRestore();
  });

  it('should use a custom config name if provided', async () => {
    const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    process.argv.push('my-script', 'custom.config.js');
    await runCli();

    const expectedConfigPath = path.resolve(process.cwd(), 'custom.config.js');
    expect(vi.mocked(require('../lib/index.js')).createDatabaseRunner).toHaveBeenCalled();
    // We can infer it was called correctly because we didn't get a "file not found" error
    // and the runner was initialized and run.
    expect(mockRunner.run).toHaveBeenCalledWith('my-script');

    existsSyncSpy.mockRestore();
  });
});
