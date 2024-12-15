export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
    public: {
        Tables: {
            'servers_quick_view': {
                Row: {
                    uuid: string,
                    uri: string,
                    countries: string,
                    status: boolean,
                    uptime7: number,
                    uptime30: number,
                    uptime90: number,
                    'last_check': string,
                    'info_page_available': boolean,
                }
            },
            'servers': {
                Insert: {
                    uri: string,
                }
            },
            'servers_statuses': {
                Row: {
                    uuid: string,
                    server_uuid: string,
                    countries: string,
                    status: boolean,
                    'info_page_available': boolean,
                    'created_at': string,
                }
            },
        }
    }
}