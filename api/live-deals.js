/* DealBot SA Stage 2: licensed Checkers feed via AZ Labs.
 * IMPORTANT: AZ Labs says its API does not confer rights to republish retailer data.
 * Do not enable without explicit written permission appropriate for DealBot SA.
 * No scraping, demo prices or vendor credentials exposed to the browser.
 */
const PROVIDER_URL = 'https://azlabs.ai/api/v1/grocery/search';

function httpsLink(value) {
  if (typeof value !== 'string' || value.length > 1800) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch (_) { return null; }
}
function text(value, length = 160) {
  return typeof value === 'string' ? value.trim().slice(0, length) : '';
}
function money(value) {
  if (value && typeof value === 'object') value = value.amount ?? value.value;
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number < 1000000
    ? Math.round(number * 100) / 100 : null;
}
function normalize(raw, parent = {}) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.store && !/checkers/i.test(String(raw.store))) return null;
  const amount = money(raw.price ?? raw.currentPrice ?? raw.salePrice);
  const name = text(raw.name ?? raw.productName ?? raw.title, 160);
  if (!name || amount === null) return null;
  const image = typeof raw.image === 'string' ? raw.image
    : raw.image?.url || (Array.isArray(raw.images) ? (typeof raw.images[0] === 'string' ? raw.images[0] : raw.images[0]?.url) : null);
  const stock = raw.stockState === 'in_stock' || raw.inStock === true ? 'in_stock'
    : raw.stockState === 'out_of_stock' || raw.inStock === false && raw.stockState !== 'unknown' ? 'out_of_stock' : 'unknown';
  const previous = money(raw.wasPrice ?? raw.previousPrice ?? raw.originalPrice);
  const member = money(raw.memberPrice);
  const promotions = Array.isArray(raw.promotions)
    ? raw.promotions.slice(0, 3).map(p => text(typeof p === 'string' ? p : p?.label ?? p?.name, 110)).filter(Boolean) : [];
  return {
    id: text(String(raw.productId ?? raw.id ?? name), 120),
    name, price: amount,
    wasPrice: previous && previous > amount ? previous : null,
    memberPrice: member, stock, promotions,
    image: httpsLink(image),
    productUrl: httpsLink(raw.url ?? raw.productUrl ?? raw.link),
    pricedAt: text(raw.pricedAt ?? raw.storeName ?? parent.pricedAt ?? 'Checkers Sixty60 — Rondebosch reference store', 140),
    fetchedAt: text(raw.fetchedAt ?? parent.fetchedAt ?? '', 48) || null
  };
}
function rows(payload) {
  if (Array.isArray(payload)) return payload;
  const data = payload && payload.data;
  const choices = [payload?.products, payload?.results, payload?.items, data?.products, data?.results, data?.items, data];
  for (const choice of choices) if (Array.isArray(choice)) return choice;
  if (Array.isArray(payload?.matches)) return payload.matches.flatMap(m => Array.isArray(m.offers) ? m.offers : []);
  return null;
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const keyConfigured = !!process.env.AZLABS_API_KEY;
  const publishingApproved = process.env.AZLABS_PUBLISHING_APPROVED === 'true';
  if (!keyConfigured || !publishingApproved) {
    return res.status(200).json({
      ok: true, live: false, source: 'AZ Labs / Checkers',
      status: !publishingApproved ? 'publishing-permission-required' : 'api-key-required',
      message: !publishingApproved
        ? 'Live Checkers price publication is disabled pending documented data-use permission.'
        : 'Provider permission recorded; the server-side API key has not been configured.',
      products: []
    });
  }
  const q = String(req.query?.q ?? '').trim();
  if (q.length < 2 || q.length > 70 || /[<>\x00-\x1f]/.test(q))
    return res.status(400).json({ ok: false, live: false, error: 'Search term must be 2–70 printable characters.' });
  const limit = Math.min(12, Math.max(1, Number.parseInt(String(req.query?.limit ?? '10'), 10) || 10));
  const target = new URL(PROVIDER_URL);
  target.searchParams.set('q', q);
  target.searchParams.set('store', 'checkers');
  target.searchParams.set('limit', String(limit));
  try {
    const response = await fetch(target.toString(), {
      headers: { Authorization: 'Bearer ' + process.env.AZLABS_API_KEY, Accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(8000), cache: 'no-store'
    });
    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502;
      return res.status(status).json({ ok: false, live: false, error: response.status === 429
        ? 'Data provider quota reached. Try again later.' : 'Data provider temporarily unavailable.' });
    }
    const payload = await response.json();
    const list = rows(payload);
    if (!list) return res.status(502).json({ ok: false, live: false, error: 'Unexpected provider data format.' });
    const products = list.map(p => normalize(p, payload)).filter(Boolean).slice(0, limit);
    return res.status(200).json({
      ok: true, live: true, source: 'AZ Labs / Checkers Sixty60',
      note: 'Independent third-party data. Not affiliated with or endorsed by Checkers.',
      region: 'Rondebosch, Cape Town (provider reference store)',
      retrievedAt: new Date().toISOString(), query: q, products
    });
  } catch (error) {
    console.error('DealBotSA licensed feed request failed:', error?.name || 'Unknown');
    return res.status(502).json({ ok: false, live: false, error: 'Could not retrieve live product data.' });
  }
};
