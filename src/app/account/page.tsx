'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchUsageHistory();
    }
  }, [status, router]);

  const fetchUsageHistory = async () => {
    try {
      const response = await fetch('/api/credits/history');
      if (response.ok) {
        const data = await response.json();
        setUsageHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch usage history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const user = session.user as any;
  const credits = user?.credits ?? 2;
  const plan = user?.plan || 'free';
  const memberSince = user?.createdAt || 'May 2026';
  const postsGenerated = user?.postsGenerated || 0;
  const maxCredits = plan === 'pro' ? 50 : 2;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">TubeToBlog</span>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Account Settings</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-5 text-gray-900">Profile</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-700">
                {session.user?.image ? (
                  <img src={session.user.image} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  session.user?.email?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{session.user?.name || 'User'}</div>
                <div className="text-gray-500 text-sm">{session.user?.email}</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Member since</span>
                <span className="text-gray-700">{memberSince}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Posts generated</span>
                <span className="text-gray-700">{postsGenerated}</span>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full mt-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition text-sm font-medium"
            >
              Sign Out
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-5 text-gray-900">Subscription</h2>
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                plan === 'pro' 
                  ? 'bg-red-50 text-primary border border-red-100' 
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}>
                {plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
              </span>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              {plan === 'pro' 
                ? '50 video conversions per month' 
                : '2 video conversions per month'}
            </div>
            <button
              className={`w-full py-3 rounded-xl font-medium transition text-sm ${
                plan === 'pro'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
              disabled={plan === 'pro'}
            >
              {plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro - $9.9/month'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-5 text-gray-900">Credits Remaining</h2>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-bold text-gray-900">{credits}</span>
              <span className="text-gray-400 mb-2 text-sm">/ {maxCredits}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min((credits / maxCredits) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">
              {plan === 'pro' 
                ? 'Upgrade to get more conversions' 
                : 'Upgrade to Pro for 50 conversions per month'}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-5 text-gray-900">Usage History</h2>
            {usageHistory.length > 0 ? (
              <div className="space-y-3">
                {usageHistory.slice(0, 5).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">{item.videoTitle || 'Video conversion'}</span>
                    <span className="text-gray-400 text-xs">{item.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No usage history yet</p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Free Plan</h3>
                <span className="text-2xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500">/forever</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  2 video conversions/month
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Markdown export
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Basic SEO structure
                </li>
              </ul>
            </div>

            <div className="bg-white border-2 border-primary rounded-2xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                Current Plan
              </div>
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Pro Plan</h3>
                <span className="text-2xl font-bold text-gray-900">$9.9</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  50 video conversions/month
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  SEO analysis & one-click export
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Priority support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}