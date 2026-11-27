import type { Result, WorldMap, WorldTopology } from '../ports';
import { attempt, err, ok } from './result';

/** The countries of the world at 1:110m, as TopoJSON, from a CDN: the website has no copy of its own. */
const WORLD_MAP_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export class CdnWorldMap implements WorldMap {
    countries(): Promise<Result<WorldTopology>> {
        return attempt(async () => {
            const answer = await fetch(WORLD_MAP_URL);
            if (!answer.ok) return err(`${answer.status} ${answer.statusText}`);
            return ok(await answer.json() as WorldTopology);
        });
    }
}
