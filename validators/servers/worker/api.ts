import WebSocket from 'ws';
import fetch from 'node-fetch';
import { simplexWsUri } from './settings';

export const testServer = async function(uri: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(simplexWsUri);

        const corrId: string = Math.round(Math.random() * 10000).toString();

        ws.on('open', () => {
            ws.send(JSON.stringify({
                corrId,
                cmd: `/_server test 1 ${uri.trim()}`
            }));
        });

        ws.on('message', (data: string) => {
            try {
                const response = JSON.parse(data);
                if (response.corrId === corrId) {
                    // Check if response contains "testFailure"
                    if (response.resp.testFailure) {
                        resolve(false); // Server is bad
                    } else {
                        resolve(true); // Server is OK
                    }
                    ws.close();
                }
            } catch (error) {
                reject(`Error parsing message: ${error}`);
            }
        });

        ws.on('error', function error(err) {
            reject(`WebSocket error: ${err.message}`);
        });
    });
}

export const isInfoPageAvailable = async function (domain: string): Promise<boolean> {
    try {
        const response = await fetch(`https://${domain}`, { method: 'GET' });
        if (!response.ok) {
            return false;
        }
        const text = await response.text();
        return text.toLowerCase().includes('simplex');
      } catch (error) {
        return false;
      }
};
