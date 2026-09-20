import { atom, type WritableAtom } from 'nanostores';
import { AbstractStore } from '../abstract-store';

export interface Server {
  uuid: string;
  host: string;
  identity: string;
  protocol: 'smp' | 'xftp';
  infoPageAvailable: boolean;
  status: boolean;
  // null when there's no status check within that window (not the same as 0% uptime)
  uptime7: number | null;
  uptime30: number | null;
  uptime90: number | null;
  lastCheck: Date | null;
  country: string;
  createdAt: Date;
}

export const getServerUri = function(server: Server): string {
    return `${server.protocol}://${server.identity}@${server.host}`;
};

export class ServersStore extends AbstractStore<Server, 'uuid', 'protocol'> {
  readonly totalCount: WritableAtom<number> = atom(0);

  constructor() {
    super(['uuid'], ['protocol']);
  }
}

export const serversStore = new ServersStore();
