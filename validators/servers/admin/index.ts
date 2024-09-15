import http from 'http';
import { Queue as BullmqQueue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import { Redis } from 'ioredis';
import { redisUri, port, queueName } from './settings.ts';


(async () => {
    const connection = new Redis(redisUri);

    const serverAdapter = new ExpressAdapter();
    createBullBoard({
        queues: [new BullMQAdapter(new BullmqQueue(queueName, { connection }))],
        // @ts-ignore
        serverAdapter: serverAdapter
    });
    const router = serverAdapter.getRouter();

    const server = http.createServer(router);
    server.listen(port);
    console.log(`Open http://localhost:${port}`);
})();
