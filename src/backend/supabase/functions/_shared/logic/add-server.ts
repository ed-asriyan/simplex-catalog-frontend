// The logic of the `add-server` function: it turns the body of a request into the answer, over the server store
// (US-B43…US-B47). An address of several hosts is a server for each, of one identity, and storing an address
// twice changes nothing, because the store finds a row before it inserts one.

import type { AddServer } from '../ports/inbound.ts';
import type { ServerStore } from '../ports/outbound.ts';
import type { Answer } from '../ports/types.ts';

export class AddServerLogic implements AddServer {
  constructor(private readonly store: ServerStore) {}

  add(_body: unknown): Promise<Answer> {
    throw new Error('todo');
  }
}
