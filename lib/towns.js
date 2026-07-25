// Every town Stepwise has a local landing page for, keyed by URL slug
// (/[slug]). This is the only place a new town needs to be added - the
// dynamic route and the global brand page's "Available in" grid both read
// from this list. Set live: false to keep a town's page showing the
// "not in this town yet" interest form instead of the real landing page.
export const TOWNS = [
  { slug: 'weymouth', displayName: 'Weymouth', region: 'Dorset', live: true }
];
