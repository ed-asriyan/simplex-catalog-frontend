import type {
    Bot, BotCheck, BotDetails, BotsFilter, BotsRead, BotsSortField, Page, PageOf, Result, Sort, BotsCatalog as BotsCatalogPort } from '../ports';

/**
 * The bots' cards: what the database narrows is asked of it, and the total a list that finds none keeps is kept
 * here (US-C8): it is that of the latest list that found some, and a bot asked for by its id is no list.
 */
export class BotsCatalog implements BotsCatalogPort {
    private lastTotal = 0;

    constructor(private readonly bots: BotsRead) {}

    async list(filter: BotsFilter, sort: Sort<BotsSortField>, page: Page): Promise<Result<PageOf<Bot>>> {
        const found = await this.bots.list(filter, sort, page);
        if (!found.ok) return found;
        if (found.value.total > 0) this.lastTotal = found.value.total;
        return { ok: true, value: { items: found.value.items, total: found.value.total || this.lastTotal } };
    }

    async bot(uuid: string): Promise<Result<Bot | null>> {
        const found = await this.bots.list(
            { uuids: { inclusive: true, values: [uuid] } }, { field: 'is_online', order: 'desc' }, { size: 1, number: 1 });
        return found.ok ? { ok: true, value: found.value.items[0] ?? null } : found;
    }

    details(uuid: string): Promise<Result<BotDetails | null>> {
        return this.bots.details(uuid);
    }

    checks(botUuids: string[], page: Page): Promise<Result<PageOf<BotCheck>>> {
        return this.bots.checks(botUuids, page);
    }
}
