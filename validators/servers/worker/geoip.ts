import dns from 'dns';
import geoip from 'geoip-country';

const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;
const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){1,6}$|^:(:[0-9a-fA-F]{1,4}){1,7}$|^::([0-9a-fA-F]{1,4}){1,6}$|^([0-9a-fA-F]{1,4}:){1,4}::([0-9a-fA-F]{1,4}){1,4}$|^::([0-9a-fA-F]{1,4}){1,7}$|^::([0-9a-fA-F]{1,4}){1,6}$|^[0-9a-fA-F]{1,4}::([0-9a-fA-F]{1,4}){1,5}$|^([0-9a-fA-F]{1,4}){1,4}::([0-9a-fA-F]{1,4}){1,5}$|^::([0-9a-fA-F]{1,4}){1,6}$|^[0-9a-fA-F]{1,4}::([0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,6}::([0-9a-fA-F]{1,4}){1,5}$|^([0-9a-fA-F]{1,4}:){1,5}::([0-9a-fA-F]{1,4}){1,6}$|^[0-9a-fA-F]{1,4}::([0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,4}::([0-9a-fA-F]{1,4}){1,4}$/i;
const isIPAddress = function (ip: string): boolean {
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

const resolve = function (domain: string): Promise<string> {
    return new Promise((resolve, reject) => {
        dns.lookup(domain, (err, address) => {
            if (err) {
                reject(err);
            } else {
                resolve(address);
            }
        });
    });
}

export const getCountry = async function (domainOrIp: string): Promise<string> {
    if (!isIPAddress(domainOrIp)) {
        domainOrIp = await resolve(domainOrIp)
    }
    return await geoip.lookup(domainOrIp)?.country;
};
