import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { setPremium } from './supabase';

// Replace with your RevenueCat API keys from https://app.revenuecat.com
// Project: Colour Blind - See Colour
const RC_IOS_KEY = 'test_jVfxnoczqNwEFoPKYXNaqAKgVQb';

export function initPurchases() {
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  if (Platform.OS === 'ios') {
    Purchases.configure({ apiKey: RC_IOS_KEY });
  }
}

export async function getPackages(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function purchasePackage(
  pkg: PurchasesPackage,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
    if (isPremium) await setPremium(userId, true);
    return { success: isPremium };
  } catch (e: any) {
    if (e.userCancelled) return { success: false };
    return { success: false, error: e.message };
  }
}

export async function restorePurchases(userId: string): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
    if (isPremium) await setPremium(userId, true);
    return isPremium;
  } catch {
    return false;
  }
}

export async function checkPremiumStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch {
    return false;
  }
}
