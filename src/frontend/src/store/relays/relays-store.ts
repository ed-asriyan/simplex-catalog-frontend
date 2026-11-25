import { atom, type WritableAtom } from 'nanostores';
import { AbstractStore } from '../abstract-store';

export interface Relay {
    uuid: string;
    url: string;
    name: string;
    photo: string | null;
    status: boolean | null;
    uptime7: number;
    uptime30: number;
    uptime90: number;
    lastCheck: Date | null;
    createdAt: Date;
}

export class RelaysStore extends AbstractStore<Relay, 'uuid'> {
  readonly totalCount: WritableAtom<number> = atom(0);

  constructor() {
    super(['uuid'], []);
  }
}

export const relaysStore = new RelaysStore();
