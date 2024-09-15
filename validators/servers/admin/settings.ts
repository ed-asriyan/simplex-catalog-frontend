export const redisUri: string = process.env['REDIS_QUEUE_URL'] as string;
export const port: string = +process.env['PORT'];
export const queueName: string = process.env['QUEUE_NAME'] as string;
