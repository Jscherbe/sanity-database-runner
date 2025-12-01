// database-runner/tests/backup.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { exec } from 'child_process';
import { backup } from '../lib/backup.js';
import { log } from '../lib/logger.js';

// Mock dependencies
vi.mock('fs-extra');
vi.mock('child_process');
vi.mock('../lib/logger.js');

describe('backup()', () => {
  const backupsPath = '/tmp/backups';
  const sanityBinPath = '/usr/local/bin/sanity';
  const dataset = 'production';

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    // Mock date to get a predictable timestamp
    vi.spyOn(global, 'Date').mockImplementation(() => new Date('2025-01-01T00:00:00.000Z'));
  });

  it('should construct and run the correct backup command', async () => {
    fs.existsSync.mockReturnValue(true);
    exec.mockImplementation((command, callback) => {
      callback(null, { stdout: 'Success', stderr: '' });
    });

    await backup({ backupsPath, sanityBinPath, dataset });

    const expectedTimestamp = '2025-01-01T00-00-00-000Z';
    const expectedBackupFile = path.join(backupsPath, `${dataset}-backup-${expectedTimestamp}.tar.gz`);
    const expectedCommand = `"${sanityBinPath}" dataset export ${dataset} "${expectedBackupFile}"`;

    expect(exec).toHaveBeenCalledWith(expectedCommand, expect.any(Function));
    expect(log.log).toHaveBeenCalledWith('Starting database backup...');
    expect(log.log).toHaveBeenCalledWith(`Executing: ${expectedCommand}`);
    expect(log.log).toHaveBeenCalledWith(`Backup successful! File created at: ${expectedBackupFile}`);
  });

  it('should create the backup directory if it does not exist', async () => {
    fs.existsSync.mockReturnValue(false);
    exec.mockImplementation((command, callback) => {
      callback(null, { stdout: 'Success', stderr: '' });
    });

    await backup({ backupsPath, sanityBinPath, dataset });

    expect(fs.ensureDirSync).toHaveBeenCalledWith(backupsPath);
    expect(log.warn).toHaveBeenCalledWith(`Backup directory "${backupsPath}" doesn't exist. Creating it now.`);
  });

  it('should throw an error if the backup command fails', async () => {
    const backupError = new Error('Command failed');
    fs.existsSync.mockReturnValue(true);
    exec.mockImplementation((command, callback) => {
      callback(backupError, { stdout: '', stderr: 'Something went wrong' });
    });

    await expect(backup({ backupsPath, sanityBinPath, dataset })).rejects.toThrow(backupError);

    expect(log.error).toHaveBeenCalledWith('Backup failed:', backupError);
  });
});
