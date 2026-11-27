import type { Page, PageOf, Result } from '@/ports';

/** The value of a `Result`, or its error thrown: a page shows it in its `{:catch}`, as `Error: <its words>`. */
export function valueOf<T>(result: Result<T>): T {
    if (!result.ok) throw new Error(result.error);
    return result.value;
}

/** As many as the backend gives in one answer. */
const PAGE_SIZE = 1000;

/** Every page of a list, read one after another until the list's total is read. */
export async function readAll<T>(read: (page: Page) => Promise<Result<PageOf<T>>>): Promise<Result<T[]>> {
    const all: T[] = [];
    for (let number = 1; ; number++) {
        const page = await read({ size: PAGE_SIZE, number });
        if (!page.ok) return page;
        all.push(...page.value.items);
        if (page.value.items.length === 0 || all.length >= page.value.total) return { ok: true, value: all };
    }
}
