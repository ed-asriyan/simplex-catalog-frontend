import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { botsDetailsStore, type BotDetails, type BotsDetailsStore } from './bots-details-store';

const parse = function (bot: any): BotDetails {
    console.log(bot);
    const replyMessage = bot['bot_reply_messages'];
    const commands = (bot['bot_profiles']?.['bot_commands'] || []) as any[];
    return {
        botUuid: bot['uuid'],
        replyMessage: replyMessage?.['text'],
        commands: commands.map(command => ({
            keyword: command.keyword,
            label: command.label
        }))
    };
};

export class BotsDetailsService {
    private readonly client: SupabaseClient;
    private readonly store: BotsDetailsStore;

    constructor(client: SupabaseClient, store: BotsDetailsStore) {
        this.client = client;
        this.store = store;
    }
    
    async fetch (botUuid: string): Promise<any> {
        const { data, error } = await this.client
            .from('bots')
            .select(
                `
                uuid,
                bot_reply_messages!bot_reply_messages_bot_uuid_fkey (*),
                bot_profiles!bot_profiles_bot_uuid_fkey (
                    *,
                    bot_commands (*)
                )
                `,
            )
            .eq(
                'uuid',
                botUuid,
            )
            .maybeSingle();

         if (error) {
            throw new Error(error.message);
         }

         if (!data) {
            throw new Error('Bot not found');
         } else {
            console.log(parse(data));
            this.store.addOrUpdate(parse(data));
         }
    }
}

export const botsDetailsService = new BotsDetailsService(supabase, botsDetailsStore);