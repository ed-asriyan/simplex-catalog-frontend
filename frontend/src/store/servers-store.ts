import { atom, type WritableAtom } from 'nanostores';
import { AbstractStore } from './abstract-store';

export interface Server {
    uuid: string;
    host: string;
    identity: string;
    protocol: 'smp' | 'xftp';
    infoPageAvailable: boolean;
    status: boolean;
    uptime7: number;
    uptime30: number;
    uptime90: number;
    lastCheck: string;
    country: string;
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
