export const simplexWsUri = process.env['SMP_CLIENT_URI'] as string;;
export const redisUri: string = process.env['REDIS_QUEUE_URL'] as string;
export const queueName: string = process.env['QUEUE_NAME'] as string;
export const supabaseUrl = process.env['SUPABASE_URL'] as string;
export const supabaseKey = process.env['SUPABASE_KEY'] as string;
export const supabaseTableName = process.env['SUPABASE_TABLE_NAME'] as string;
export const cronRule = process.env['CRON_RULE'] as string;
