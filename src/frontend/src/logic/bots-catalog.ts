import type {
    Bot, BotCheck, BotDetails, BotsFilter, BotsRead, BotsSortField, Page, PageOf, Result, Sort, BotsCatalog as BotsCatalogPort } from '../ports';

/**
 * The bots' cards: what the database narrows is asked of it (US-C1…US-C15).
 */
export class BotsCatalog implements BotsCatalogPort {
    constructor(private readonly bots: BotsRead) {}

    async list(filter: BotsFilter, sort: Sort<BotsSortField>, page: Page): Promise<Result<PageOf<Bot>>> {
        return this.bots.list(filter, sort, page);
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
