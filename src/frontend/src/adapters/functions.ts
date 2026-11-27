// What a visitor adds goes to the project's edge functions through supabase-js, with the public key (design
// rule 2). A function that refuses an address answers with an error status and `{ error }`, whose words are
// shown to the visitor as they are; an answer without them is told as the function's failure.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result, Submission } from '../ports';
import { attempt, err, ok } from './result';

export class SupabaseSubmission implements Submission {
    constructor(private readonly client: SupabaseClient) {}

    addServer(uri: string): Promise<Result<void>> {
        return this.invoke('add-server', { uri }, 'Failed to add server');
    }

    addBot(url: string): Promise<Result<void>> {
        return this.invoke('add-bot', { url }, 'Failed to add bot');
    }

    addRelay(url: string): Promise<Result<void>> {
        return this.invoke('add-relay', { url }, 'Failed to add relay');
    }

    private invoke(name: string, body: Record<string, string>, failure: string): Promise<Result<void>> {
        return attempt(async () => {
            const { error } = await this.client.functions.invoke(name, { method: 'POST', body });
            if (!error) return ok(undefined);
            let answer: unknown;
            try {
                answer = await error.context.json();
            } catch {
                answer = null;
            }
            const words = typeof answer === 'object' && answer !== null ? (answer as { error?: unknown }).error : undefined;
            return err(typeof words === 'string' && words ? words : failure);
        });
    }
}
