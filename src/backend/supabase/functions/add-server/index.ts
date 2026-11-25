import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const regex = /^(smp|xftp):\/\/([A-Za-z0-9\-\–_+=:]+)@((?:\[[\da-fA-F:]+\](?::\d{1,5})?|[A-Za-z0-9.-]+(?::\d{1,5})?|[\da-fA-F:]+)(?:,(?:\[[\da-fA-F:]+\](?::\d{1,5})?|[A-Za-z0-9.-]+(?::\d{1,5})?|[\da-fA-F:]+))*)$/i;

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

// Request context for automatic error logging
interface RequestContext {
  body?: any;
  uri?: string;
  parsed?: { protocol: string; identity: string; hosts: string[] } | null;
  protocolId?: number | null;
  identityUuid?: string;
  currentHost?: string;
  hostUuid?: string;
  serverUuid?: string;
}

const sanitizeContext = (context: RequestContext) => ({
  ...context,
  parsed: context.parsed ? {
    ...context.parsed,
    identity: context.parsed.identity?.substring(0, 8) + '...'
  } : undefined
});

const logError = (message: string, context: RequestContext, error?: any) => {
  console.error(`[add-server] ${message}`, {
    ...sanitizeContext(context),
    ...(error && {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
  });
};

const logInfo = (message: string, context: RequestContext, extra?: Record<string, any>) => {
  console.info(`[add-server] ${message}`, {
    ...sanitizeContext(context),
    ...extra
  });
};

Deno.serve(async (req) => {
  const ctx: RequestContext = {};

  if (req.method === 'OPTIONS') {
    return createResponse(204);
  }

  if (req.method !== 'POST') {
    return createResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    ctx.body = await req.json();
  } catch (error) {
    logError('Failed to parse request body', ctx, error);
    return createResponse(400, { error: 'Invalid JSON' });
  }
  
  ctx.uri = ctx.body.uri;
  if (!ctx.uri) {
    logError('Missing uri parameter in request body', ctx);
    return createResponse(400, { error: 'Missing uri' });
  }

  ctx.parsed = parseUri(ctx.uri);
  if (!ctx.parsed) {
    logError('Invalid URI format', ctx);
    return createResponse(400, { status: 1, error: 'Invalid URI format' });
  }

  logInfo('Processing URI', ctx);

  ctx.protocolId = ctx.parsed.protocol === 'smp' ? 1 : ctx.parsed.protocol === 'xftp' ? 2 : null;
  if (!ctx.protocolId) {
    logError('Unknown protocol', ctx);
    return createResponse(400, { status: 2, error: `Unknown protocol: ${ctx.parsed.protocol}` });
  }

  // Find or insert identity
  const { data: identityRow, error: identitySelectError } = await supabase
    .from('server_identities')
    .select('uuid')
    .eq('identity', ctx.parsed.identity)
    .maybeSingle();
  
  if (identitySelectError) {
    logError('Failed to query server_identities', ctx, identitySelectError);
    return createResponse(500, { status: 3, error: identitySelectError.message });
  }

  ctx.identityUuid = identityRow?.uuid;
  if (!ctx.identityUuid) {
    const { data, error } = await supabase
      .from('server_identities')
      .insert({ identity: ctx.parsed.identity })
      .select('uuid')
      .single();
    if (error) {
      logError('Failed to insert server_identities', ctx, error);
      return createResponse(500, { status: 3, error: error.message });
    }
    ctx.identityUuid = data.uuid;
    logInfo('Created new identity', ctx);
  } else {
    logInfo('Using existing identity', ctx);
  }

  for (const host of ctx.parsed.hosts) {
    ctx.currentHost = host;
    
    // Find or insert host
    const { data: hostRow, error: hostSelectError } = await supabase
      .from('server_hosts')
      .select('uuid')
      .eq('host', host)
      .maybeSingle();
    
    if (hostSelectError) {
      logError('Failed to query server_hosts', ctx, hostSelectError);
      return createResponse(500, { status: 4, error: hostSelectError.message });
    }

    ctx.hostUuid = hostRow?.uuid;
    if (!ctx.hostUuid) {
      const { data, error } = await supabase
        .from('server_hosts')
        .insert({ host })
        .select('uuid')
        .single();
      if (error) {
        logError('Failed to insert server_hosts', ctx, error);
        return createResponse(500, { status: 4, error: error.message });
      }
      ctx.hostUuid = data.uuid;
      logInfo('Created new host', ctx);
    } else {
      logInfo('Using existing host', ctx);
    }

    // Find or insert server
    const { data: serverRow, error: serverSelectError } = await supabase
      .from('servers')
      .select('uuid')
      .eq('protocol', ctx.protocolId)
      .eq('host_uuid', ctx.hostUuid)
      .eq('identity_uuid', ctx.identityUuid)
      .maybeSingle();
    
    if (serverSelectError) {
      logError('Failed to query server', ctx, serverSelectError);
      return createResponse(500, { status: 5, error: serverSelectError.message });
    }

    ctx.serverUuid = serverRow?.uuid;
    if (!ctx.serverUuid) {
      const { error } = await supabase
        .from('servers')
        .insert({ protocol: ctx.protocolId, host_uuid: ctx.hostUuid, identity_uuid: ctx.identityUuid });
      if (error) {
        logError('Failed to insert server', ctx, error);
        return createResponse(500, { status: 5, error: error.message });
      }
      logInfo('Created new server', ctx);
    } else {
      logInfo('Server already exists', ctx);
    }
  }

  logInfo('Successfully processed all hosts', ctx);
  return createResponse(204);
});
