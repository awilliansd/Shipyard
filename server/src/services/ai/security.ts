// server/src/services/ai/security.ts

import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { DATA_DIR } from '../dataDir.js';
import { BaseProviderConfig } from './types.js';

const ENCRYPTION_KEY_FILE = join(DATA_DIR, '.ai-provider-key');
const CONFIG_DIR = join(DATA_DIR, 'providers');

// --- Core Encryption Logic ---

/**
 * Retrieves the master encryption key, creating it if it doesn't exist.
 */
async function getEncryptionKey(): Promise<Buffer> {
  try {
    const keyHex = await readFile(ENCRYPTION_KEY_FILE, 'utf-8');
    return Buffer.from(keyHex.trim(), 'hex');
  } catch {
    const key = randomBytes(32);
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(ENCRYPTION_KEY_FILE, key.toString('hex'), 'utf-8');
    return key;
  }
}

/**
 * Encrypts a string using AES-256-GCM.
 */
function encrypt(text: string, key: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts a string using AES-256-GCM.
 */
function decrypt(data: string, key: Buffer): string {
  const [ivHex, tagHex, encrypted] = data.split(':');
  if (!ivHex || !tagHex || !encrypted) {
    throw new Error('Invalid encrypted data format.');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

// --- Generic Config Management ---

function getConfigPath(providerId: string): string {
  return join(CONFIG_DIR, `${providerId}.json`);
}

/**
 * Saves and encrypts the configuration for a specific AI provider.
 * If the config object has an `apiKey`, it will be encrypted.
 */
export async function saveEncryptedConfig<T extends BaseProviderConfig>(
  providerId: string,
  config: T,
): Promise<void> {
  const key = await getEncryptionKey();
  await mkdir(CONFIG_DIR, { recursive: true });

  const configToSave: any = { ...config };

  if (configToSave.apiKey) {
    configToSave.apiKey = encrypt(configToSave.apiKey, key);
  }

  await writeFile(getConfigPath(providerId), JSON.stringify(configToSave, null, 2), 'utf-8');
}

/**
 * Loads and decrypts the configuration for a specific AI provider.
 * If the loaded config has an `apiKey`, it will be decrypted.
 */
export async function loadEncryptedConfig<T extends BaseProviderConfig>(
  providerId: string,
): Promise<T | null> {
  try {
    const filePath = getConfigPath(providerId);
    const fileContent = await readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    if (data.apiKey) {
      const key = await getEncryptionKey();
      data.apiKey = decrypt(data.apiKey, key);
    }

    return data as T;
  } catch {
    return null;
  }
}

/**
 * Deletes the configuration file for a specific AI provider.
 */
export async function deleteEncryptedConfig(providerId: string): Promise<void> {
  try {
    await unlink(getConfigPath(providerId));
  } catch (err: any) {
    // Ignore 'file not found' errors
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}
