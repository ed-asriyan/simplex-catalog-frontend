import { AbstractStore } from './abstract-store';

export interface BotStatus {
    uuid: string;
    botUuid: string;
    isOnline: boolean;
    createdAt: Date;
}

export class BotStatusesStore extends AbstractStore<BotStatus, 'uuid', 'botUuid'> {
  constructor() {
    super(['uuid'], ['botUuid']);
  }
}

export const botsStatusesStore = new BotStatusesStore();