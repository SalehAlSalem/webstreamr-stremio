/* istanbul ignore file */
import fs from 'node:fs';
import * as os from 'node:os';
import { KeyvCacheableMemory } from 'cacheable';
import { glob } from 'glob';
import { KeyvStoreAdapter } from 'keyv';
import winston from 'winston';
import { envGet } from './env';

const getCacheDir = (): string => envGet('CACHE_DIR') ?? os.tmpdir();

export const createKeyvSqlite = (_name: string): KeyvStoreAdapter => {
  return new KeyvCacheableMemory();
};

export const clearCache = async (logger: winston.Logger): Promise<void> => {
  for (const file of await glob(`${getCacheDir()}/webstreamr*`)) {
    logger.info(`Delete cache file ${file}`);
    fs.rmSync(file);
  }
};
