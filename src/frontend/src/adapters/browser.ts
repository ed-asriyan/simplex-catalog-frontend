// What the visitor's browser keeps and does for the website: its storage, its clipboard, its files, and where the
// website is served from and when. What the browser refuses (storage that is blocked or full, a clipboard it does
// not let be written, a file it cannot read) is an error `Result`, never thrown (design rule 8).

import type { Clipboard, Environment, Files, Labels, ListName, Result, VisitorStorage } from '../ports';
import { attempt, attemptNow, err, ok } from './result';

/**
 * The keys and the shapes earlier visits kept the filters and the labels under, JSON text: a returning visitor's
 * filters and labels are read from them as they were left (US-B23, US-B30, US-C10, US-D10).
 */
const FILTERS_KEY: Record<ListName, string> = {
    servers: 'serversFilter',
    bots: 'botsFilter',
    relays: 'relaysFilter',
};
const LABELS_KEY = 'labels_servers_uuid';

export class LocalVisitorStorage implements VisitorStorage {
    loadFilters(list: ListName): Result<unknown | null> {
        return this.load(FILTERS_KEY[list]);
    }

    saveFilters(list: ListName, filters: unknown): Result<void> {
        return this.save(FILTERS_KEY[list], filters);
    }

    loadLabels(): Result<Labels | null> {
        return this.load(LABELS_KEY) as Result<Labels | null>;
    }

    saveLabels(labels: Labels): Result<void> {
        return this.save(LABELS_KEY, labels);
    }

    private load(key: string): Result<unknown | null> {
        return attemptNow(() => {
            const text = localStorage.getItem(key);
            return ok(text === null ? null : JSON.parse(text));
        });
    }

    private save(key: string, value: unknown): Result<void> {
        return attemptNow(() => {
            localStorage.setItem(key, JSON.stringify(value));
            return ok(undefined);
        });
    }
}

export class BrowserClipboard implements Clipboard {
    copy(text: string): Promise<Result<void>> {
        return attempt(async () => {
            await navigator.clipboard.writeText(text);
            return ok(undefined);
        });
    }
}

export class BrowserFiles implements Files {
    save(name: string, contents: string, type: string): void {
        try {
            const url = URL.createObjectURL(new Blob([contents], { type }));
            const link = document.createElement('a');
            link.href = url;
            link.download = name;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('The browser did not save the file:', error);
        }
    }

    /** The browser says a choice was cancelled by `cancel`, and one that was not by `change`. */
    open(type: string): Promise<Result<string | null>> {
        return attempt(() => new Promise<Result<string | null>>(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = type;
            input.addEventListener('cancel', () => resolve(ok(null)));
            input.addEventListener('change', () => {
                const file = input.files?.[0];
                if (!file) {
                    resolve(ok(null));
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => resolve(ok(reader.result as string));
                reader.onerror = () => resolve(err('Error reading file'));
                reader.readAsText(file);
            });
            input.click();
        }));
    }
}

export class BrowserEnvironment implements Environment {
    readonly host = location.hostname;

    now(): Date {
        return new Date();
    }
}
