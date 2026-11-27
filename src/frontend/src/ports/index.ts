// The website's ports. The pages call the inbound ones (`inbound.ts`), which its logic implements; the logic
// reaches outside only through the outbound ones (`outbound.ts`), which the adapters implement; `types.ts` is
// what they exchange. `main.ts` makes the adapters and the logic and hands the inbound ports to the pages;
// error reports and analytics are started there too, and nothing else of the website calls them.

export type * from './types';
export type * from './inbound';
export type * from './outbound';
