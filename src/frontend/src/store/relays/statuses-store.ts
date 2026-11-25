import { AbstractStore } from '../abstract-store';

export interface RelayStatus {
    uuid: string;
    relayUuid: string;
    status: boolean;
    createdAt: Date;
}

export class RelayStatusesStore extends AbstractStore<RelayStatus, 'uuid', 'relayUuid'> {
  constructor() {
    super(['uuid'], ['relayUuid']);
  }
}

export const relayStatusesStore = new RelayStatusesStore();
