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
  } catch {
    return null;
  }
};

const parseUrl = function (url: string): URL | null {
  try {
    return new URL(url);
  } catch {
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
  NotBotAddress,
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

  if (url.pathname === '/a') {
    const keyBase64 = url.hash.slice(1);
    const key = decodeBase64Url(keyBase64);
    return key.length === INVITATION_CODE_LENGTH ? ValidationStatus.Valid : ValidationStatus.InvalidContactData;
  } else if (url.pathname === '/contact') {
    const hashParams = new URLSearchParams(url.hash.slice(2));

    const data = hashParams.get('data');
    if (data && (typeof tryToParseJson(data)?.groupLinkId) === 'string') {
      return ValidationStatus.NotBotAddress;
    }

    const smp = hashParams.get('smp');
    if (!smp) {
      return ValidationStatus.InvalidContactData;
    }
    const smpUrl = parseUrl(smp);
    if (!smpUrl || smpUrl.protocol !== 'smp:') {
      return ValidationStatus.InvalidContactData;
    }

    return ValidationStatus.Valid;
  } else {
    return ValidationStatus.NotBotAddress;
  }
}

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
  const { url } = body;

  if (!url) {
    return createResponse(400, { error: 'Missing url' });
  }

  const parsedUrl = parseUrl(url);
  if (!parsedUrl) {
    return createResponse(400, { status: 1, error: 'Invalid URL format' });
  }
  const validationStatus = validateUrl(parsedUrl);
  switch (validationStatus) {
    case ValidationStatus.InvalidProtocol:
      return createResponse(400, { status: 2, error: 'URL must use HTTPS protocol' });
    case ValidationStatus.NotBotAddress:
      return createResponse(400, { status: 3, error: 'URL is not a bot address' });
    case ValidationStatus.NotAllowedHostname:
      return createResponse(400, { status: 4, error: 'Hostname is not allowed' });
    case ValidationStatus.InvalidContactData:
      return createResponse(400, { status: 6, error: 'Invalid contact data in URL' });
  }

  // never should happen, but just in case
  if (validationStatus !== ValidationStatus.Valid) {
    return createResponse(400, { status: 1, error: 'Invalid URL format' });
  }

  const { error } = await supabase
    .from('bots')
    .insert({ address: url })
  if (error) return createResponse(500, { status: 3, error: error.message });

  return createResponse(204);
});
