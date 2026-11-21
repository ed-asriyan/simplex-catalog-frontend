import { analyticsMeasurementId, isProduction } from './settings';

export const trackRaw = function (...args: any[]) {
    if (isProduction) {
        // @ts-ignore
        analyticsMeasurementId && window.dataLayer.push(arguments);
    } else {
        console.log('Google Analytics:', ...args);
    }
};

// Use a non-abstract base class to avoid leaving TS-only syntax in the compiled output.
export class Event<T> {
    // definite assignment assertion keeps TS happy; removed at compile time
    readonly name!: string;
    readonly params: T;

    constructor(params: T) {
        this.params = params;
    }
}

export class ClickEvent extends Event<{
    target: string;
}> {
    readonly name: string = 'click';
}

export const track = function<T> (event: Event<T>) {
    trackRaw('event', event.name, event.params);
};
