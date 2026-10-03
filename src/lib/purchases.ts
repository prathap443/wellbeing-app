import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { type CustomerInfo, type PurchasesPackage, PURCHASES_ERROR_CODE } from 'react-native-purchases';

// RevenueCat public iOS SDK key (starts with "appl_"). Safe to ship in the app.
const IOS_KEY: string = Constants.expoConfig?.extra?.revenueCatIosKey ?? '';
export const PLUS_ENTITLEMENT = 'plus';

/** In-app purchases run only in the iOS build with a RevenueCat key; the browser preview shows the paywall read-only. */
// Real public keys are long; placeholders such as "appl_xxxxx" count as not configured.
const hasRealKey = /^appl_[A-Za-z0-9]{15,}$/.test(IOS_KEY) && !/x{4,}/i.test(IOS_KEY);
export const purchasesAvailable = () => Platform.OS === 'ios' && hasRealKey;

let configured = false;
export function configurePurchases(appUserId?: string | null) {
  if (!purchasesAvailable() || configured) return;
  Purchases.configure({ apiKey: IOS_KEY, appUserID: appUserId ?? null });
  configured = true;
}

export const isPlus = (info: CustomerInfo | null | undefined) => !!info?.entitlements.active[PLUS_ENTITLEMENT];

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  return Purchases.getCustomerInfo().catch(() => null);
}

export async function getAppUserId(): Promise<string | null> {
  if (!configured) return null;
  return Purchases.getAppUserID().catch(() => null);
}

export async function getPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export type PurchaseResult = { status: 'purchased'; info: CustomerInfo } | { status: 'cancelled' } | { status: 'failed'; message: string };

export async function buy(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: 'purchased', info: customerInfo };
  } catch (e: any) {
    if (e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || e?.userCancelled) return { status: 'cancelled' };
    return { status: 'failed', message: e?.message ?? 'The purchase could not be completed.' };
  }
}

export async function restore(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  return Purchases.restorePurchases();
}

/** Ties purchases to the signed-in account so Plus follows the user to other devices. */
export async function linkAccount(userId: string): Promise<CustomerInfo | null> {
  if (!configured) return null;
  return (await Purchases.logIn(userId)).customerInfo;
}

export async function unlinkAccount(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  // logOut throws if the current user is already anonymous.
  return Purchases.logOut().catch(() => null);
}

export function onCustomerInfo(listener: (info: CustomerInfo) => void): () => void {
  if (!configured) return () => undefined;
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
}
