export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
    public: {
        Tables: {
            'servers_all': {
                Row: {
                    uuid: string,
                    host: string,
                    protocol: number,
                    identity: string,
                    country: string,
                    status: boolean,
                    uptime7: number,
                    uptime30: number,
                    uptime90: number,
                    'last_check': string,
                    'info_page_available': boolean,
                }
            },
            'parse_queue': {
                Insert: {
                    uri: string,
                }
            },
            'server_status': {
                Row: {
                    uuid: string,
                    server_uuid: string,
                    country: string,
                    status: boolean,
                    'info_page_available': boolean,
                    'created_at': string,
                }
            },
        }
    }
}