// Checks whether a RevenueCat customer has an active "plus" entitlement.
// Uses RevenueCat REST API v1 with the secret key, cached briefly to avoid
// a network call on every coach question.

export const PLUS_ENTITLEMENT = process.env.REVENUECAT_ENTITLEMENT || 'plus';
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { plus: boolean; at: number }>();

type Fetch = typeof fetch;

export async function hasPlus(appUserId: string | null, fetchImpl: Fetch = fetch, now = Date.now()): Promise<boolean> {
  const secret = process.env.REVENUECAT_SECRET_KEY;
  if (!appUserId || !secret || appUserId.length > 200) return false;
  const cached = cache.get(appUserId);
  if (cached && now - cached.at < CACHE_MS) return cached.plus;

  try {
    const response = await fetchImpl(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return cached?.plus ?? false;
    const data = (await response.json()) as { subscriber?: { entitlements?: Record<string, { expires_date?: string | null }> } };
    const entitlement = data.subscriber?.entitlements?.[PLUS_ENTITLEMENT];
    // expires_date is null for lifetime purchases.
    const plus = !!entitlement && (entitlement.expires_date == null || Date.parse(entitlement.expires_date) > now);
    cache.set(appUserId, { plus, at: now });
    return plus;
  } catch {
    return cached?.plus ?? false;
  }
}

export function clearEntitlementCache(appUserId?: string) {
  if (appUserId) cache.delete(appUserId);
  else cache.clear();
}
