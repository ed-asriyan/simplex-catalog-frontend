import { expect, it } from 'vitest';
import { Copying } from './copying';
import { FakeClipboard } from './fakes';

// US-B6
it('copies the whole address to the clipboard', async () => {
    const clipboard = new FakeClipboard();
    const address = 'smp://64jc_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E@smp.example.com';
    expect(await new Copying(clipboard).copy(address)).toEqual({ ok: true, value: undefined });
    expect(clipboard.copied).toEqual([address]);
});

// US-C14
it('copies a bot\'s address as it is, whatever characters it has', async () => {
    const clipboard = new FakeClipboard();
    const address = 'https://simplex.chat/contact#/?v=2-7&smp=smp%3A%2F%2Fkey%40smp.example.com';
    await new Copying(clipboard).copy(address);
    expect(clipboard.copied).toEqual([address]);
});

// US-D2
it('gives an error, and does not throw, when the browser does not let the clipboard be written', async () => {
    const clipboard = new FakeClipboard();
    clipboard.failure = 'Permission denied';
    expect(await new Copying(clipboard).copy('x')).toEqual({ ok: false, error: 'Permission denied' });
    expect(clipboard.copied).toEqual([]);
});
