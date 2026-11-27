// What the stores share of reaching the database: the client with the project's secret key, and turning what
// went wrong into the `Result` the ports give. A store never throws: the database's error and anything thrown
// behind it are the message of an error `Result`, and are logged with the database's code, details and hint.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Result } from '../ports/types.ts';

export type Database = SupabaseClient;

/** The client of the project, with the secret key: it passes by the policies, so only the stores hold it. */
export const secretClient = (): Database =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

type DatabaseError = { message: string; code?: string; details?: string; hint?: string };

/** The error `Result` of what the database answered with, its message as it is. */
export const failed = (step: string, error: DatabaseError): { ok: false; error: string } => {
  console.error(`[${step}] ${error.message}`, { code: error.code, details: error.details, hint: error.hint });
  return { ok: false, error: error.message };
};

/** What the step gives, or the error `Result` of what it threw. */
export const attempt = async <T>(step: string, run: () => Promise<Result<T>>): Promise<Result<T>> => {
  try {
    return await run();
  } catch (thrown) {
    return failed(step, { message: thrown instanceof Error ? thrown.message : String(thrown) });
  }
};
