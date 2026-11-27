// The logic of the `add-bot` function: it turns the body of a request into the answer, over the bot store
// (US-C16…US-C21). A bot is stored by the address as given, not approved; one already stored is the store's
// error, which the visitor reads as it is.

import type { AddBot } from '../ports/inbound.ts';
import type { BotStore } from '../ports/outbound.ts';
import type { Answer } from '../ports/types.ts';

export class AddBotLogic implements AddBot {
  constructor(private readonly store: BotStore) {}

  add(_body: unknown): Promise<Answer> {
    throw new Error('todo');
  }
}
