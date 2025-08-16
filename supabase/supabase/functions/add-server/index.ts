import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const regex = /^(smp|xftp):\/\/([A-Za-z0-9\-\–_+=:]+)@([A-Za-z0-9.-]+(:\d{1,5})?(,[A-Za-z0-9.-]+(:\d{1,5})?)*)$/i;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const parseUri = function (uri: string) {
  const match = uri.match(regex);
  if (!match) return null;
  return {
    protocol: match[1],
    identity: match[2],
    hosts: match[3].split(',')
  };
};

const createResponse = function(status: number, obj: any = null): Response {
  return new Response(obj && JSON.stringify(obj), { status, headers: corsHeaders });
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return createResponse(204);
  }

  if (req.method !== 'POST') {
    return createResponse(405, { error: 'Method Not Allowed' });
  }

  if (req.method !== 'POST') {
    return createResponse(405, { error: 'Method Not Allowed' });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return createResponse(400, { error: 'Invalid JSON' });
  }

  if (req.method !== 'POST') {
    return createResponse(405, { error: 'Method Not Allowed' });
  }
  const { uri } = body;

  if (!uri) {
    return createResponse(400, { error: 'Missing uri' });
  }

  const parsed = parseUri(uri);
  if (!parsed) {
    return createResponse(400, { status: 1, error: 'Invalid URI format' });
  }

  const protocolId = parsed.protocol === 'smp' ? 1 : parsed.protocol === 'xftp' ? 2 : null;
  if (!protocolId) {
    return createResponse(400, { status: 2, error: 'Unknown protocol' });
  }

  // Find or insert identity
  const { data: identityRow } = await supabase
    .from('server_identity')
    .select('uuid')
    .eq('identity', parsed.identity)
    .maybeSingle();
  let identityUuid = identityRow?.uuid;
  if (!identityUuid) {
    const { data, error } = await supabase
      .from('server_identity')
      .insert({ identity: parsed.identity })
      .select('uuid')
      .single();
    if (error) return createResponse(500, { status: 3, error: error.message });
    identityUuid = data.uuid;
  }

  for (const host of parsed.hosts) {
    // Find or insert host
    const { data: hostRow } = await supabase
      .from('server_host')
      .select('uuid')
      .eq('host', host)
      .maybeSingle();
    let hostUuid = hostRow?.uuid;
    if (!hostUuid) {
      const { data, error } = await supabase
        .from('server_host')
        .insert({ host })
        .select('uuid')
        .single();
      if (error) return createResponse(500, { status: 4, error: error.message });
      hostUuid = data.uuid;
    }

    // Find or insert server
    const { data: serverRow } = await supabase
      .from('server')
      .select('uuid')
      .eq('protocol', protocolId)
      .eq('host_uuid', hostUuid)
      .eq('identity_uuid', identityUuid)
      .maybeSingle();
    if (!serverRow) {
      const { error } = await supabase
        .from('server')
        .insert({ protocol: protocolId, host_uuid: hostUuid, identity_uuid: identityUuid });
      if (error) return createResponse(500, { status: 5, error: error.message });
    }
  }

  return createResponse(204);
});
