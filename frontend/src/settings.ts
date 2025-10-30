export const url = import.meta.env['VITE_URL']?.trim();

export const sentryDsn = import.meta.env['VITE_SENTRY_DSN']?.trim();

export const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] as string;
export const supabaseKey = import.meta.env['VITE_SUPABASE_KEY'] as string;
export const supabaseServersTableName = import.meta.env['VITE_SUPABASE_SERVERS_TABLE_NAME'] as string;
export const supabaseServersStatusesTableName = import.meta.env['VITE_SUPABASE_SERVERS_STATUSES_TABLE_NAME'] as string;
export const supabaseServersQuickViewTableName = import.meta.env['VITE_SUPABASE_SERVERS_QUICK_VIEW_TABLE_NAME'] as string;

export const environment = import.meta.env['MODE'];
export const isProduction = import.meta.env['PROD'] && environment === 'production';

export const analyticsMeasurementId = import.meta.env['VITE_ANALYTICS_MEASHUREMENT_ID']?.trim();

export const simplexGroupLink = import.meta.env['VITE_SIMPLEX_GROUP_LINK']?.trim();
