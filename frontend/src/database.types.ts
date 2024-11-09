export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
    public: {
        Tables: {
            'servers_quick_view': {
                Row: {
                    uuid: string,
                    uri: string,
                    country: string,
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
            }
        }
    }
}