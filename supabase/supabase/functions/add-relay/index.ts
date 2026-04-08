import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const INVITATION_CODE_LENGTH = 32;

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

const decodeBase64Url = function (input: string): Uint8Array {
  // Replace Base64URL chars with standard Base64 chars
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  
  // Pad with '=' to make length a multiple of 4
  while (base64.length % 4) {
    base64 += '=';
  }

  // Use Buffer if in Node, or atob if in Browser
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  } else if (typeof atob !== 'undefined') {
    const binString = atob(base64);
    const len = binString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return bytes;
  } else {
    throw new Error("Environment does not support Base64 decoding (Buffer or atob missing).");
  }
}

enum ValidationStatus {
  Valid,
  InvalidProtocol,
  NotRelayAddress,
  NotAllowedHostname,
  InvalidContactData,
}

const validateUrl = function (url: URL): ValidationStatus {
  if (url.protocol !== 'https:') {
    return ValidationStatus.InvalidProtocol;
  }

  if (BANNED_HOSTNAMES.includes(url.hostname.toLowerCase())) {
    return ValidationStatus.NotAllowedHostname;
  }

  if (url.pathname === '/r') {
    const keyBase64 = url.hash.slice(1);
    const key = decodeBase64Url(keyBase64);
    return key.length === INVITATION_CODE_LENGTH ? ValidationStatus.Valid : ValidationStatus.InvalidContactData;
  } else {
    return ValidationStatus.NotRelayAddress;
  }
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
}

const sanitizeContext = (context: RequestContext) => ({
  ...context,
  parsedUrl: context.parsedUrl ? {
    protocol: context.parsedUrl.protocol,
    hostname: context.parsedUrl.hostname,
    pathname: context.parsedUrl.pathname
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

  ctx.validationStatus = validateUrl(ctx.parsedUrl);
  switch (ctx.validationStatus) {
    case ValidationStatus.InvalidProtocol:
      logError('Invalid protocol', ctx);
      return createResponse(400, { status: 2, error: 'URL must use HTTPS protocol' });
    case ValidationStatus.NotRelayAddress:
      logError('Not a relay address', ctx);
      return createResponse(400, { status: 3, error: 'URL is not a relay address' });
    case ValidationStatus.NotAllowedHostname:
      logError('Hostname not allowed', ctx);
      return createResponse(400, { status: 4, error: 'Hostname is not allowed' });
    case ValidationStatus.InvalidContactData:
      logError('Invalid contact data', ctx);
      return createResponse(400, { status: 6, error: 'Invalid contact data in URL' });
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
