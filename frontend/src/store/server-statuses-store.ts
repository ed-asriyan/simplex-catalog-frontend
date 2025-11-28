import { AbstractStore } from './abstract-store';

export interface ServerStatus {
    uuid: string;
    serverUuid: string;
    country: string;
    status: boolean;
    infoPageAvailable: boolean;
    createdAt: Date;
}

export class ServerStatusesStore extends AbstractStore<ServerStatus, 'uuid', 'serverUuid'> {
  constructor() {
    super(['uuid'], ['serverUuid']);
  }
}

export const serverStatusesStore = new ServerStatusesStore();