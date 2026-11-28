import { beforeEach, expect, it } from 'vitest';
import { Adding } from './adding';
import { FakeSubmission } from './fakes';

let submission: FakeSubmission;
let adding: Adding;

beforeEach(() => {
    submission = new FakeSubmission();
    adding = new Adding(submission);
});

const serverUri = 'smp://64jc_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E@smp.example.com';

// US-B44
it('hands the backend the server address as it was entered, and is ok once the backend has taken it', async () => {
    expect(await adding.addServer(serverUri)).toEqual({ ok: true, value: undefined });
    expect(submission.entered).toEqual([{ kind: 'server', text: serverUri }]);
});

// US-B47
it('gives the backend\'s answer to an address that is not a server\'s as it is', async () => {
    submission.answers.set('https://smp.example.com', 'Invalid URI format');
    expect(await adding.addServer('https://smp.example.com')).toEqual({ ok: false, error: 'Invalid URI format' });
});

// US-C17
it('hands the backend the bot\'s link as it was entered', async () => {
    const url = 'https://smp.example.com/a#lW0aZ7sMhEoQXxqk2ZRVrbq2yCwYrJkqM1gYbJcJbG0';
    expect((await adding.addBot(url)).ok).toBe(true);
    expect(submission.entered).toEqual([{ kind: 'bot', text: url }]);
});

// US-C18
it('gives the backend\'s answer to a bot\'s link with anything after its key as it is', async () => {
    const url = 'https://smp.example.com/a#lW0aZ7sMhEoQXxqk2ZRVrbq2yCwYrJkqM1gYbJcJbG0?c=abc';
    submission.answers.set(url, 'URL has invalid format. Invalid contact data.');
    expect(await adding.addBot(url)).toEqual({ ok: false, error: 'URL has invalid format. Invalid contact data.' });
});

// US-C19
it('is ok when the backend accepts a bot the catalog has already', async () => {
    const url = 'https://smp.example.com/a#known';
    expect(await adding.addBot(url)).toEqual({ ok: true, value: undefined });
    expect(submission.entered).toEqual([{ kind: 'bot', text: url }]);
});

// US-D18
it('hands the backend the relay\'s address as it was entered', async () => {
    const url = 'https://smp.example.com/r#nH3m0Y3f3kz2lQ9w5o6mE0b7cU1xR4tS8vJ2aK6dLfQ?h=abc.onion&p=5223';
    expect((await adding.addRelay(url)).ok).toBe(true);
    expect(submission.entered).toEqual([{ kind: 'relay', text: url }]);
});

// US-D19
it('is ok when the backend accepts a relay the catalog has already', async () => {
    const url = 'https://smp.example.com/r#known';
    expect(await adding.addRelay(url)).toEqual({ ok: true, value: undefined });
    expect(submission.entered).toEqual([{ kind: 'relay', text: url }]);
});

// US-D20
it('gives the backend\'s reason for an address that is not a relay\'s as it is, however long and with whatever spacing', async () => {
    const reason = 'URL has invalid format.\n  Not a relay link.  ';
    submission.answers.set('nope', reason);
    expect(await adding.addRelay('nope')).toEqual({ ok: false, error: reason });
});

// US-B43
it('gives a failure of the backend as an error Result, and does not throw', async () => {
    submission.answers.set('down', 'Failed to add server');
    await expect(adding.addServer('down')).resolves.toEqual({ ok: false, error: 'Failed to add server' });
});
