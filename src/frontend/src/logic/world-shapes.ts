import type { Result, WorldMap, WorldTopology, WorldShapes as WorldShapesPort } from '../ports';

/** The world map of the servers (US-B2). */
export class WorldShapes implements WorldShapesPort {
    constructor(private readonly worldMap: WorldMap) {}

    async countries(): Promise<Result<WorldTopology>> {
        throw new Error('todo');
    }
}
