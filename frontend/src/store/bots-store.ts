import { atom, type WritableAtom } from 'nanostores';
import { AbstractStore } from './abstract-store';

export interface Bot {
    uuid: string;
    address: string;
    name: string;
    description: string | null;
    isOnline: boolean | null;
    uptime7: number;
    uptime30: number;
    uptime90: number;
    lastCheck: Date | null;
    createdAt: Date;
    photo: string | null;
}

export class BotsStore extends AbstractStore<Bot, 'uuid'> {
  readonly totalCount: WritableAtom<number> = atom(0);

  constructor() {
    super(['uuid'], []);
  }
}

export const botsStore = new BotsStore();
