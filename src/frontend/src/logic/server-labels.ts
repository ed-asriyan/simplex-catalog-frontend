import type { Files, Labels, Result, VisitorStorage, ServerLabels as ServerLabelsPort } from '../ports';
import type { Environment } from '../ports';

/**
 * The labels `added` and `ignored` a visitor gives servers (US-B30…US-B33, US-B38). They are kept in memory and
 * saved in the browser with every toggle and replacement; `markAdded` does not save, the next saving takes it along.
 */
export class ServerLabels implements ServerLabelsPort {
    constructor(
        private readonly storage: VisitorStorage,
        private readonly files: Files,
        private readonly environment: Environment,
    ) {}

    current(): Labels {
        throw new Error('todo');
    }

    toggle(_serverUuid: string, _label: string): void {
        throw new Error('todo');
    }

    markAdded(_serverUuid: string): void {
        throw new Error('todo');
    }

    export(): void {
        throw new Error('todo');
    }

    async read(): Promise<Result<Labels | null>> {
        throw new Error('todo');
    }

    replace(_labels: Labels): void {
        throw new Error('todo');
    }
}
