import React, { useEffect, useState } from 'react';
import { CameraScreen } from './src/screens/CameraScreen';
import { GalleryScreen } from './src/screens/GalleryScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { PhotoAdjustScreen } from './src/screens/PhotoAdjustScreen';
import { PaywallModal } from './src/components/PaywallModal';
import { initPurchases, purchasePackage, getPackages } from './src/utils/purchases';
import { getUser, supabase } from './src/utils/supabase';
import { recordInstallDate } from './src/utils/storage';
import type { PurchasesPackage } from 'react-native-purchases';

type Screen = 'camera' | 'gallery' | 'auth' | 'photoAdjust';

export default function App() {
  const [screen, setScreen] = useState<Screen>('camera');
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Record first-launch date for 1-day free trial
    recordInstallDate();

    // Init RevenueCat
    initPurchases();

    // Load paywall packages
    getPackages().then(setPackages);

    // Check auth state
    getUser().then(u => setUserId(u?.id ?? null));

    // Listen for auth changes (magic link deep link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user) setScreen('camera');
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    if (!userId) {
      setPaywallVisible(false);
      setScreen('auth');
      return;
    }
    const pkg = packages.find(p =>
      plan === 'annual'
        ? p.packageType === 'ANNUAL'
        : p.packageType === 'MONTHLY'
    );
    if (pkg) {
      await purchasePackage(pkg, userId);
    }
    setPaywallVisible(false);
  };

  return (
    <>
      {screen === 'camera' && (
        <CameraScreen
          onOpenGallery={() => setScreen('gallery')}
          onShowPaywall={() => setPaywallVisible(true)}
          onOpenPhotoAdjust={() => setScreen('photoAdjust')}
        />
      )}
      {screen === 'gallery' && (
        <GalleryScreen
          onBack={() => setScreen('camera')}
          onShowAuth={() => setScreen('auth')}
        />
      )}
      {screen === 'auth' && (
        <AuthScreen onSkip={() => setScreen('camera')} />
      )}
      {screen === 'photoAdjust' && (
        <PhotoAdjustScreen
          onBack={() => setScreen('camera')}
          onShowPaywall={() => setPaywallVisible(true)}
        />
      )}

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onSubscribe={handleSubscribe}
      />
    </>
  );
}
