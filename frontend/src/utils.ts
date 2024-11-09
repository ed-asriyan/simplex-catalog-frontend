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
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints) || '1';
};
