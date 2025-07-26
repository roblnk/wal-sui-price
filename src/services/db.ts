
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

const UserPreferencesSchema = z.object({
    email: z.string().default(""),
    minRange: z.string().default("0.000000"),
    maxRange: z.string().default("0.000000"),
    notificationsEnabled: z.boolean().default(false),
    lastNotifiedState: z.enum(['in-range', 'out-of-range']).nullable().default(null),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

const dbPath = path.resolve(process.cwd(), 'src', 'services', 'db.json');

async function ensureDbFile(): Promise<UserPreferences> {
    try {
        await fs.access(dbPath);
        const data = await fs.readFile(dbPath, 'utf-8');
        if (data.trim() === '') {
          throw new Error('DB file is empty.');
        }
        return UserPreferencesSchema.parse(JSON.parse(data));
    } catch (error) {
        console.warn('DB file not found, empty, or corrupted. Creating a new one with default values.');
        const defaultData = UserPreferencesSchema.parse({});
        await fs.writeFile(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
        return defaultData;
    }
}

export async function readUserPreferences(): Promise<UserPreferences> {
    const prefs = await ensureDbFile();
    return prefs;
}

export async function updateUserPreferences(prefs: Partial<UserPreferences>): Promise<void> {
    const currentPrefs = await readUserPreferences();
    const newPrefs = { ...currentPrefs, ...prefs };
    const validatedPrefs = UserPreferencesSchema.parse(newPrefs);
    await fs.writeFile(dbPath, JSON.stringify(validatedPrefs, null, 2), 'utf-8');
}


export async function getUserPreferences(): Promise<UserPreferences> {
    return await readUserPreferences();
}
    
