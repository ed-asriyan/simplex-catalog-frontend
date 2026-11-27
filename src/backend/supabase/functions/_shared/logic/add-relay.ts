// The logic of the `add-relay` function: it turns the body of a request into the answer, over the relay store
// (US-D17…US-D21). A relay is stored by the address as given; one already stored is the store's error, which the
// visitor reads as it is.

import type { AddRelay } from '../ports/inbound.ts';
import type { RelayStore } from '../ports/outbound.ts';
import type { Answer } from '../ports/types.ts';

export class AddRelayLogic implements AddRelay {
  constructor(private readonly store: RelayStore) {}

  add(_body: unknown): Promise<Answer> {
    throw new Error('todo');
  }
}
