import { beforeEach, describe, expect, it } from 'vitest';
import { FakeFiles, FakeStorage, err, ok, unwrap } from './fakes';
import type { Environment } from '../ports';
import { ServerLabels } from './server-labels';

const environment: Environment = { host: 'simplex-catalog.asriyan.me', now: () => new Date('2026-11-25T10:00:00.000Z') };

let storage: FakeStorage;
let files: FakeFiles;
let labels: ServerLabels;

beforeEach(() => {
    storage = new FakeStorage();
    files = new FakeFiles();
    labels = new ServerLabels(storage, files, environment);
});

describe('toggle', () => {
    // US-B30
    it('has no server labelled on a first visit', () => {
        expect(labels.current()).toEqual({ added: [], ignored: [] });
    });

    // US-B30
    it('sets a label, and clears it when the server has it', () => {
        labels.toggle('a', 'added');
        expect(labels.current().added).toEqual(['a']);
        labels.toggle('a', 'added');
        expect(labels.current().added).toEqual([]);
    });

    // US-B30
    it('keeps the two labels of a server apart', () => {
        labels.toggle('a', 'added');
        labels.toggle('a', 'ignored');
        labels.toggle('a', 'added');
        expect(labels.current()).toEqual({ added: [], ignored: ['a'] });
    });

    // US-B30
    it('saves all the labels in the browser with every toggle', () => {
        labels.toggle('a', 'added');
        labels.toggle('b', 'ignored');
        expect(storage.labels).toEqual({ added: ['a'], ignored: ['b'] });
        labels.toggle('a', 'added');
        expect(storage.labels).toEqual({ added: [], ignored: ['b'] });
    });

    // US-B30
    it('has the labels saved earlier when the visitor comes back', () => {
        storage.labels = { added: ['a', 'b'], ignored: ['c'] };
        const back = new ServerLabels(storage, files, environment);
        expect(back.current()).toEqual({ added: ['a', 'b'], ignored: ['c'] });
    });

    // US-B30
    it('has both labels, empty, when what the browser kept holds only one', () => {
        storage.labels = { added: ['a'] };
        expect(new ServerLabels(storage, files, environment).current()).toEqual({ added: ['a'], ignored: [] });
    });

    // US-B30
    it('starts with none, and does not throw, when the browser does not let the labels be read', () => {
        storage.loadFailure = 'blocked';
        expect(new ServerLabels(storage, files, environment).current()).toEqual({ added: [], ignored: [] });
    });

    // US-B30
    it('still sets the label on the page, and does not throw, when the browser does not keep it', () => {
        storage.saveFailure = 'quota';
        expect(() => labels.toggle('a', 'added')).not.toThrow();
        expect(labels.current().added).toEqual(['a']);
    });

    // US-B30
    it('does not give out what it holds to be changed from outside', () => {
        labels.toggle('a', 'added');
        labels.current().added.push('hacked');
        expect(labels.current().added).toEqual(['a']);
    });
});

describe('the added label', () => {
    // US-B38
    it('sets the label on the page without saving it', () => {
        labels.markAdded('a');
        expect(labels.current().added).toEqual(['a']);
        expect(storage.labelSaves).toEqual([]);
    });

    // US-B38
    it('is saved along by the next toggle of any server', () => {
        labels.markAdded('a');
        labels.toggle('b', 'ignored');
        expect(storage.labels).toEqual({ added: ['a'], ignored: ['b'] });
    });

    // US-B38
    it('is gone after a reload when nothing was toggled since', () => {
        labels.markAdded('a');
        expect(new ServerLabels(storage, files, environment).current().added).toEqual([]);
    });

    // US-B38
    it('does not clear the label of a server that has it', () => {
        labels.toggle('a', 'added');
        labels.markAdded('a');
        expect(labels.current().added).toEqual(['a']);
    });
});

describe('export', () => {
    // US-B31
    it('makes the browser save the labels as <host>_labels_<time>.json', () => {
        labels.toggle('a', 'added');
        labels.export();
        expect(files.saved).toHaveLength(1);
        expect(files.saved[0].name).toBe('simplex-catalog.asriyan.me_labels_2026-11-25T10:00:00.000Z.json');
        expect(files.saved[0].type).toBe('application/json');
    });

    // US-B31
    it('saves the labels as a file that holds them, and imports back as they were', async () => {
        labels.toggle('a', 'added');
        labels.toggle('b', 'ignored');
        labels.export();
        expect(JSON.parse(files.saved[0].contents)).toEqual({ added: ['a'], ignored: ['b'] });

        files.chosen = ok(files.saved[0].contents);
        expect(unwrap(await labels.read())).toEqual({ added: ['a'], ignored: ['b'] });
    });

    // US-B31
    it('names the file by the time of the export', () => {
        let now = new Date('2026-11-25T10:00:00.000Z');
        const clock = new ServerLabels(storage, files, { host: 'h.example', now: () => now });
        clock.export();
        now = new Date('2026-11-26T11:30:15.250Z');
        clock.export();
        expect(files.saved.map(f => f.name)).toEqual([
            'h.example_labels_2026-11-25T10:00:00.000Z.json',
            'h.example_labels_2026-11-26T11:30:15.250Z.json',
        ]);
    });

    // US-B31
    it('exports the label marked as added too, though it is not saved', () => {
        labels.markAdded('a');
        labels.export();
        expect(JSON.parse(files.saved[0].contents).added).toEqual(['a']);
    });
});

describe('import', () => {
    // US-B32
    it('gives the labels of the file the visitor chooses, changing none yet', async () => {
        labels.toggle('x', 'added');
        files.chosen = ok(JSON.stringify({ added: ['a', 'b', 'c'], ignored: ['d'] }));
        expect(unwrap(await labels.read())).toEqual({ added: ['a', 'b', 'c'], ignored: ['d'] });
        expect(files.opened).toEqual(['application/json']);
        expect(labels.current().added).toEqual(['x']);
    });

    // US-B32
    it('gives null when the visitor chooses no file', async () => {
        files.chosen = ok(null);
        expect(unwrap(await labels.read())).toBeNull();
    });

    // US-B32
    it('gives an error when the file cannot be read', async () => {
        files.chosen = err('Error reading file');
        expect(await labels.read()).toEqual({ ok: false, error: 'Error reading file' });
    });

    // US-B32
    it('gives an error, and does not throw, for a file that is not JSON', async () => {
        files.chosen = ok('this is not json');
        const result = await labels.read();
        expect(result.ok).toBe(false);
    });

    // US-B32
    it('gives an error for a file whose labels are not lists of servers', async () => {
        for (const contents of ['null', '[]', '"added"', '{"added": "a"}', '{"added": [1, 2]}']) {
            files.chosen = ok(contents);
            expect((await labels.read()).ok, contents).toBe(false);
        }
    });

    // US-B32
    it('puts the labels of the file in place of the visitor\'s, and saves them', () => {
        labels.toggle('x', 'added');
        labels.toggle('y', 'ignored');
        labels.replace({ added: ['a', 'b'], ignored: [] });
        expect(labels.current()).toEqual({ added: ['a', 'b'], ignored: [] });
        expect(storage.labels).toEqual({ added: ['a', 'b'], ignored: [] });
    });

    // US-B32
    it('has both labels after a file that holds one', () => {
        labels.replace({ added: ['a'] });
        expect(labels.current()).toEqual({ added: ['a'], ignored: [] });
    });

    // US-B33
    it('leaves the labels as they were when the visitor cancels, which is not to replace', async () => {
        labels.toggle('x', 'added');
        files.chosen = ok(JSON.stringify({ added: ['a'], ignored: [] }));
        await labels.read();
        expect(labels.current()).toEqual({ added: ['x'], ignored: [] });
        expect(storage.labels).toEqual({ added: ['x'], ignored: [] });
    });

    // US-B32
    it('still replaces the labels on the page, and does not throw, when the browser does not keep them', () => {
        storage.saveFailure = 'quota';
        expect(() => labels.replace({ added: ['a'], ignored: [] })).not.toThrow();
        expect(labels.current().added).toEqual(['a']);
    });
});
