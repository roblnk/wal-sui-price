
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

export interface UserPreferences {
    email: string;
    minRange: string;
    maxRange: string;
    notificationsEnabled: boolean;
    lastNotifiedState: 'in-range' | 'out-of-range' | null;
}

const dbPath = path.resolve(process.cwd(), 'src', 'services', 'db.json');

async function ensureDbFile(): Promise<void> {
    try {
        await fs.access(dbPath);
    } catch (error) {
        const defaultData: UserPreferences = {
            email: "",
            minRange: "0.000000",
            maxRange: "0.000000",
            notificationsEnabled: false,
            lastNotifiedState: null,
        };
        await fs.writeFile(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
}

export async function readUserPreferences(): Promise<UserPreferences> {
    await ensureDbFile();
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data) as UserPreferences;
}

export async function writeUserPreferences(prefs: Partial<UserPreferences>): Promise<void> {
    const currentPrefs = await readUserPreferences();
    const newPrefs = { ...currentPrefs, ...prefs };
    await fs.writeFile(dbPath, JSON.stringify(newPrefs, null, 2), 'utf-8');
}

    