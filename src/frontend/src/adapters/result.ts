import type { Page, Result } from '../ports';

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (error: string): Result<never> => ({ ok: false, error });

/** The words of whatever was thrown or answered as an error, as the visitor can read them. */
export function messageOf(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error) return String(error.message);
    return String(error);
}

/** What `run` gives, or an error `Result` for whatever it throws or rejects with (design rule 8). */
export async function attempt<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
        return await run();
    } catch (error) {
        return err(messageOf(error));
    }
}

/** The same, for what the browser does at once. */
export function attemptNow<T>(run: () => Result<T>): Result<T> {
    try {
        return run();
    } catch (error) {
        return err(messageOf(error));
    }
}

/** The first and the last row of a page, from 0, as `range` takes them. */
export function rangeOf(page: Page): [number, number] {
    const from = page.size * (page.number - 1);
    return [from, from + page.size - 1];
}
