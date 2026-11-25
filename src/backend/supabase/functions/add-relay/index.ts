import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseRelayShortLink, type RelayShortLink, ShortLinkError } from "./short-link.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const BANNED_HOSTNAMES = [
  'localhost',
];

const tryToParseJson = function (input: string): any | null {
  try {
    return JSON.parse(input);
  } catch (error) {
    console.debug('[add-relay] Failed to parse JSON:', { input: input.substring(0, 50) });
    return null;
  }
};

const parseUrl = function (url: string): URL | null {
  try {
    return new URL(url);
  } catch (error) {
    console.debug('[add-relay] Failed to parse URL:', { url, error: (error as Error).message });
    return null;
  }
};

enum ValidationStatus {
  Valid,
  InvalidProtocol,
  NotRelayAddress,
  NotAllowedHostname,
  InvalidContactData,
}

const SHORT_LINK_ERROR_STATUSES: Record<ShortLinkError, ValidationStatus> = {
  [ShortLinkError.InvalidProtocol]: ValidationStatus.InvalidProtocol,
  [ShortLinkError.NotRelayAddress]: ValidationStatus.NotRelayAddress,
  [ShortLinkError.InvalidContactData]: ValidationStatus.InvalidContactData,
};

const validateUrl = function (url: URL): { status: ValidationStatus; link?: RelayShortLink } {
  const { link, error } = parseRelayShortLink(url);
  if (!link) {
    return { status: SHORT_LINK_ERROR_STATUSES[error] };
  }

  if (link.hosts.some((host) => BANNED_HOSTNAMES.includes(host.toLowerCase()))) {
    return { status: ValidationStatus.NotAllowedHostname };
  }

  return { status: ValidationStatus.Valid, link };
}

const createResponse = function(status: number, obj: any = null): Response {
  return new Response(obj && JSON.stringify(obj), { status, headers: corsHeaders });
};

// Request context for automatic error logging
interface RequestContext {
  body?: any;
  url?: string;
  parsedUrl?: URL;
  validationStatus?: ValidationStatus;
  link?: RelayShortLink;
}

const sanitizeContext = (context: RequestContext) => ({
  ...context,
  parsedUrl: context.parsedUrl ? {
    protocol: context.parsedUrl.protocol,
    hostname: context.parsedUrl.hostname,
    pathname: context.parsedUrl.pathname
  } : undefined,
  link: context.link ? {
    hosts: context.link.hosts,
    port: context.link.port,
    keyHash: context.link.keyHash
  } : undefined
});

const logError = (message: string, context: RequestContext, error?: any) => {
  console.error(`[add-relay] ${message}`, {
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
  console.info(`[add-relay] ${message}`, {
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
  
  ctx.url = ctx.body.url;
  if (!ctx.url) {
    logError('Missing url parameter in request body', ctx);
    return createResponse(400, { error: 'Missing url' });
  }

  ctx.parsedUrl = parseUrl(ctx.url);
  if (!ctx.parsedUrl) {
    logError('Invalid URL format', ctx);
    return createResponse(400, { status: 1, error: 'Invalid URL format' });
  }

  logInfo('Validating URL', ctx);

  ({ status: ctx.validationStatus, link: ctx.link } = validateUrl(ctx.parsedUrl));
  switch (ctx.validationStatus) {
    case ValidationStatus.InvalidProtocol:
      logError('Invalid protocol', ctx);
      return createResponse(400, { status: 2, error: 'URL has invalid format. Schema must be HTTPS' });
    case ValidationStatus.NotRelayAddress:
      logError('Not a relay address', ctx);
      return createResponse(400, { status: 3, error: 'URL is not a relay address' });
    case ValidationStatus.NotAllowedHostname:
      logError('Hostname not allowed', ctx);
      return createResponse(400, { status: 4, error: 'Hostname is not allowed' });
    case ValidationStatus.InvalidContactData:
      logError('Invalid contact data', ctx);
      return createResponse(400, { status: 6, error: 'URL has invalid format. Invalid contact data.' });
  }

  // never should happen, but just in case
  if (ctx.validationStatus !== ValidationStatus.Valid) {
    logError('Unexpected validation status', ctx);
    return createResponse(400, { status: 1, error: 'Invalid URL format' });
  }

  const { error } = await supabase
    .from('relays')
    .insert({ url: ctx.url })
  if (error) {
    logError('Failed to insert relay', ctx, error);
    return createResponse(500, { status: 3, error: error.message });
  }

  logInfo('Successfully added relay', ctx);
  return createResponse(204);
});
