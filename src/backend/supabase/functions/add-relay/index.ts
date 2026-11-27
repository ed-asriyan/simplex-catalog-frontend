// The HTTP handler of `add-relay`: CORS, the method and the JSON of the request, then the logic, whose answer it
// puts on the wire. What the request means is the logic's (`_shared/logic/add-relay.ts`); how it is stored is the
// store's (`_shared/adapters/relay-store.ts`).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { SupabaseRelayStore } from '../_shared/adapters/relay-store.ts';
import { secretClient } from '../_shared/adapters/supabase.ts';
import { AddRelayLogic } from '../_shared/logic/add-relay.ts';
import type { Answer } from '../_shared/ports/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const respond = (answer: Answer): Response => {
  if (answer.http === 204) return new Response(null, { status: 204, headers: corsHeaders });
  console.error('[add-relay]', answer.http, answer.body);
  return new Response(JSON.stringify(answer.body), { status: answer.http, headers: corsHeaders });
};

const logic = new AddRelayLogic(new SupabaseRelayStore(secretClient()));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return respond({ http: 204 });
  if (req.method !== 'POST') return respond({ http: 405, body: { error: 'Method Not Allowed' } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return respond({ http: 400, body: { error: 'Invalid JSON' } });
  }
  return respond(await logic.add(body));
});
