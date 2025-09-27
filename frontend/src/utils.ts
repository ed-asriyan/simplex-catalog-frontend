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

export const exportFile = function (data: string, filename: string, type: string) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

export const importFile = async function (accept: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files.length === 0) {
                reject(new Error('No file selected'));
                return;
            }
            const file = target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            reader.readAsText(file);
        };
        input.click();
    });
};
