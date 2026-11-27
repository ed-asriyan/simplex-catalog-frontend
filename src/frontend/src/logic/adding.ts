import type { Result, Submission, Adding as AddingPort } from '../ports';

/** What a visitor adds: the backend's answer is given as it is, to be shown as it is (US-B43…US-B47, US-B54, US-C16…US-C21, US-D17…US-D21). */
export class Adding implements AddingPort {
    constructor(private readonly submission: Submission) {}

    addServer(uri: string): Promise<Result<void>> {
        return this.submission.addServer(uri);
    }

    addBot(url: string): Promise<Result<void>> {
        return this.submission.addBot(url);
    }

    addRelay(url: string): Promise<Result<void>> {
        return this.submission.addRelay(url);
    }
}
