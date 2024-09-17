export interface ServerUri {
    type: 'smp' | 'xftp';
    domain: string;
};

const domainPattern = /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g;
const extractDomain = function (inputString: string): string | null {
    const matches = inputString.match(domainPattern);
    return matches ? matches[0] : null;
}

export const parseUri = function (uri: string): ServerUri {
    const type = uri.split(':')[0] as 'smp' | 'xftp';
    if (uri.endsWith('.onion')) {
        if (uri.includes(',')){
            return {
                type,
                domain: extractDomain(uri),
            };
        } else {
            return {
                type,
                domain: null,
            };
        }
    } else {
        return {
            type,
            domain: extractDomain(uri),
        }
    }
};

export const isServerOfficial = function (uri: string): boolean {
    return uri.includes('simplex.im');
};
