import { AbstractStore } from '../abstract-store';

export interface BotCommand {
  keyword: string;
  label: string;
}

export interface BotDetails {
    botUuid: string;
    greetingMessage?: string;
    commands: BotCommand[];
}

export class BotsDetailsStore extends AbstractStore<BotDetails, 'botUuid'> {
  constructor() {
    super(['botUuid'], []);
  }
}

export const botsDetailsStore = new BotsDetailsStore();
