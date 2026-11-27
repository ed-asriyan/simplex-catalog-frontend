import type { Clipboard, Result, Copying as CopyingPort } from '../ports';

/** What a visitor copies with a click (US-B6, US-C14, US-D2, US-D15). */
export class Copying implements CopyingPort {
    constructor(private readonly clipboard: Clipboard) {}

    async copy(_text: string): Promise<Result<void>> {
        throw new Error('todo');
    }
}
