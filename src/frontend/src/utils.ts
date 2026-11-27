import { replace } from "@mateothegreat/svelte5-router";

export const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export const delay = function (callback, ms) {
  let timer = 0;
  return function() {
      let context = this;
      let args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        callback.apply(context, args);
      }, ms || 0);
  };
};

export const convertUTCDateToLocalDate = function (date: Date): Date {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);  
};

export const countryCodeToName = function (code: string): string {
    if (code) {
        try {
            code = new Intl.DisplayNames(['en'], {
              type: 'region',
            }).of(code) || code;
        } catch {
        }
    }
    return code;
};

export const getFlagEmoji = function (countryCode: string): string {
    if (!countryCode) {
        return null;
    }
    if (countryCode === 'TOR') {
        return '🧅';
    }
    if (countryCode === 'YGGDRASIL') {
        return '🌿';
    }
    if (countryCode === 'I2P') {
        return '🧄';
    }
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints) || '1';
};

export const setQueryParam = function (route: any, mass: Record<string, string>): void {
    const path = `/#${route.route.path}`;
    const query: Record<string, string> = { ...route.result.querystring.params, ...mass };

    const queryString = Object.entries(query)
        .filter(([_, v]) => v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

    replace(`${path}?${queryString}`);
};