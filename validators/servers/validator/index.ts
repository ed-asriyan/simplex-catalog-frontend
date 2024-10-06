import { isInfoPageAvailable, testServer } from './api';
import { deleteRecord, getAllServers, addServerStatus, Server } from './database';
import { isServerOfficial, parseUri } from './uri-parser';
import { getCountry } from './geoip';

const log = function (s: string) {
    console.log(`[${new Date().toISOString()}] ${s}`);
};

const handleServer = async function (server: Server) {
    const { uri, uuid } = server;

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
    await addServerStatus({ serverUuid: uuid, status, country, infoPageAvailable });
    log('Done');
};

const shuffle = function<T> (array: T[]): T[] {
    let currentIndex = array.length;
  
    while (currentIndex != 0) {
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
};

const main = async function () {
    for (const server of shuffle(await getAllServers())) {
        await handleServer(server);
    }
}

main();
