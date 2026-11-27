import type {
    Bot, BotCheck, BotDetails, BotsFilter, BotsRead, BotsSortField, Page, PageOf, Result, Sort, BotsCatalog as BotsCatalogPort } from '../ports';

/** The bots' cards: what the database narrows is asked of it, and the total a list that finds none keeps is kept here (US-C8). */
export class BotsCatalog implements BotsCatalogPort {
    constructor(private readonly bots: BotsRead) {}

    async list(_filter: BotsFilter, _sort: Sort<BotsSortField>, _page: Page): Promise<Result<PageOf<Bot>>> {
        throw new Error('todo');
    }

    async bot(_uuid: string): Promise<Result<Bot | null>> {
        throw new Error('todo');
    }

    async details(_uuid: string): Promise<Result<BotDetails | null>> {
        throw new Error('todo');
    }

    async checks(_botUuids: string[], _page: Page): Promise<Result<PageOf<BotCheck>>> {
        throw new Error('todo');
    }
}
