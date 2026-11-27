import { createClient } from '@supabase/supabase-js';
import type { OutboundPorts } from '../ports';
import { BrowserClipboard, BrowserEnvironment, BrowserFiles, LocalVisitorStorage } from './browser';
import { SupabaseBots, SupabaseRelays, SupabaseServers } from './database';
import { SupabaseSubmission } from './functions';
import { CdnWorldMap } from './world-map';

/** The outbound ports over the backend the project's URL and public key reach, and the browser the website runs in. */
export function makeOutboundPorts(supabaseUrl: string, supabaseKey: string): OutboundPorts {
    const client = createClient(supabaseUrl, supabaseKey);
    const storage = new LocalVisitorStorage();
    return {
        servers: new SupabaseServers(client),
        bots: new SupabaseBots(client),
        relays: new SupabaseRelays(client),
        submission: new SupabaseSubmission(client),
        storage,
        clipboard: new BrowserClipboard(),
        files: new BrowserFiles(),
        worldMap: new CdnWorldMap(),
        environment: new BrowserEnvironment(),
    };
}
