import type { Environment, Files, Labels, Result, VisitorStorage, ServerLabels as ServerLabelsPort } from '../ports';

/** The labels every visitor has, empty or not, in the order the browser has always kept them. */
const KNOWN = ['added', 'ignored'] as const;

const FILE_TYPE = 'application/json';

const isServerList = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every(uuid => typeof uuid === 'string');

/** What a labels file holds, when it holds labels: an object whose every value is a list of servers' ids. */
const asLabels = (value: unknown): Labels | null => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    return Object.values(value).every(isServerList) ? value as Labels : null;
};

/**
 * The labels `added` and `ignored` a visitor gives servers (US-B30…US-B33, US-B38). They are kept in memory and
 * saved in the browser with every toggle, addition and replacement. The browser keeps them under the key and in
 * the shape earlier visits left them in (`VisitorStorage`), so a returning visitor finds them; what it does not let
 * be read or kept leaves the labels on the page as they are.
 */
export class ServerLabels implements ServerLabelsPort {
    private labels: Labels;

    constructor(
        private readonly storage: VisitorStorage,
        private readonly files: Files,
        private readonly environment: Environment,
    ) {
        const kept = storage.loadLabels();
        const saved = kept.ok && kept.value !== null && typeof kept.value === 'object' ? kept.value : {};
        this.labels = Object.fromEntries(KNOWN.map(label => {
            const uuids: unknown = saved[label];
            return [label, isServerList(uuids) ? [...uuids] : []];
        }));
    }

    current(): Labels {
        return Object.fromEntries(Object.entries(this.labels).map(([label, uuids]) => [label, [...uuids]]));
    }

    toggle(serverUuid: string, label: string): void {
        const uuids = this.labels[label] ?? [];
        this.labels[label] = uuids.includes(serverUuid) ? uuids.filter(uuid => uuid !== serverUuid) : [...uuids, serverUuid];
        this.save();
    }

    markAdded(serverUuid: string): void {
        if (!this.labels.added.includes(serverUuid)) {
            this.labels.added = [...this.labels.added, serverUuid];
            this.save();
        }
    }

    export(): void {
        const name = `${this.environment.host}_labels_${this.environment.now().toISOString()}.json`;
        this.files.save(name, JSON.stringify(this.labels), FILE_TYPE);
    }

    async read(): Promise<Result<Labels | null>> {
        const chosen = await this.files.open(FILE_TYPE);
        if (!chosen.ok) return chosen;
        if (chosen.value === null) return { ok: true, value: null };
        let parsed: unknown;
        try {
            parsed = JSON.parse(chosen.value);
        } catch {
            return { ok: false, error: 'The file is not a labels file' };
        }
        const labels = asLabels(parsed);
        return labels ? { ok: true, value: labels } : { ok: false, error: 'The file is not a labels file' };
    }

    replace(labels: Labels): void {
        const replaced: Labels = Object.fromEntries(KNOWN.map(label => [label, []]));
        for (const [label, uuids] of Object.entries(labels)) replaced[label] = [...uuids];
        this.labels = replaced;
        this.save();
    }

    private save(): void {
        this.storage.saveLabels(this.current());
    }
}
