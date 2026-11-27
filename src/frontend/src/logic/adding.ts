import type { Result, Submission, Adding as AddingPort } from '../ports';

/** What a visitor adds: the backend's answer is given as it is, to be shown as it is (US-B43…US-B47, US-C16…US-C21, US-D17…US-D21). */
export class Adding implements AddingPort {
    constructor(private readonly submission: Submission) {}

    async addServer(_uri: string): Promise<Result<void>> {
        throw new Error('todo');
    }

    async addBot(_url: string): Promise<Result<void>> {
        throw new Error('todo');
    }

    async addRelay(_url: string): Promise<Result<void>> {
        throw new Error('todo');
    }
}
