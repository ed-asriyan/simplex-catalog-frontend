import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import cron from 'node-cron';
import { redisUri, queueName, cronRule } from './settings';
import { isInfoPageAvailable, testServer } from './api';
import { deleteRecord, getAllRecords, subscribe, updateRecord } from './database';
import { isServerOfficial, parseUri } from './uri-parser';
import { getCountry } from './geoip';

const connection = new Redis(redisUri, { maxRetriesPerRequest: null });


const handleServer = async function (uri: string, log: (s: string) => void) {
    if (isServerOfficial(uri)) {
        log('Server is official. Deleting...');
        await deleteRecord(uri);
        log('Done');
        return;
    }

    log(`Testing ${uri}...`);
    const status = await testServer(uri);
    log(`Done: ${status}`);

    const parsedUri = parseUri(uri);

    let country: string | undefined;
    log('Detecting geolocation...');
    try {
        if (!uri.endsWith('.onion')) {
            if (parsedUri?.domain) {
                country = await getCountry(parsedUri.domain);
            }
        } else {
            country = 'TOR';
        }
        log(`Done: ${country}`);
    } catch (e) {
        log(`Error while detecting country: ${e}`);
    }

    log('Detecting geolocation...');
    let infoPageAvailable: boolean = false;
    if (parsedUri.domain) {
        infoPageAvailable = await isInfoPageAvailable(parsedUri.domain);
    }
    log(`Done: ${infoPageAvailable}`);

    log('Updating the record in database...');
    await updateRecord({ uri, status, country, infoPageAvailable });
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

const shuffle = function<T> (array: T[]): T[] {
    let currentIndex = array.length;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
};

const addServerChecksToQueue = async function () {
    const queue = new Queue(queueName, { connection });
    for (const server of shuffle(await getAllRecords())) {
        await queue.add(`schedule ${server.uri}`, { serverUri: server.uri });
    }
};

subscribe(async newUri => {
    const queue = new Queue(queueName, { connection });
    await queue.add(`new ${newUri}`, { serverUri: newUri });
});

cron.schedule(cronRule, addServerChecksToQueue);
