import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import cron from 'node-cron';
import { redisUri, queueName, cronRule } from './settings';
import { testServer } from './api';
import { getAllRecords, subscribe, updateRecord } from './database';

const connection = new Redis(redisUri, { maxRetriesPerRequest: null });

const handleServer = async function (uri: string, log: (s: string) => void) {
    log(`Testing ${uri}...`);
    const status = await testServer(uri);
    log(`Done: ${status}. Updating the record in database...`);
    await updateRecord(uri, status);
    log('Done');
};

new Worker(queueName, async job => {
    const { serverUri } = job.data;
    const log = (s: string) => {
        const l = `${new Date().toISOString()} | ${s}`;
        console.log(`${job.id} | ${l}`);
        job.log(l);
    };
    await handleServer(serverUri, log);
}, { connection });

const addServerChecksToQueue = async function () {
    const queue = new Queue(queueName, { connection });
    for (const server of await getAllRecords()) {
        await queue.add(`schedule ${server.uri}`, { serverUri: server.uri });
    }
};

subscribe(async newUri => {
    const queue = new Queue(queueName, { connection });
    await queue.add(`new ${newUri}`, { serverUri: newUri });
});

cron.schedule(cronRule, addServerChecksToQueue);
