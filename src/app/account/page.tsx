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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
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

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">Profile</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold">
                {session.user?.image ? (
                  <img src={session.user.image} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  session.user?.email?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div>
                <div className="text-xl font-semibold">{session.user?.name || 'User'}</div>
                <div className="text-gray-400 text-sm">{session.user?.email}</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Member since</span>
                <span>{memberSince}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Posts generated</span>
                <span>{postsGenerated}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">Subscription</h2>
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                plan === 'pro' 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'bg-white/10 text-gray-300 border border-white/20'
              }`}>
                {plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
              </span>
            </div>
            <div className="text-sm text-gray-400 mb-4">
              {plan === 'pro' 
                ? '50 video conversions per month' 
                : '2 video conversions per month'}
            </div>
            <button
              className={`w-full py-3 rounded-xl font-medium transition ${
                plan === 'pro'
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
              }`}
              disabled={plan === 'pro'}
            >
              {plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
            </button>
          </div>

          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">Credits remaining</h2>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-bold text-green-400">{credits}</span>
              <span className="text-gray-400 mb-2">/ 2</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((credits / 2) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400">
              {plan === 'pro' 
                ? 'Upgrade to Pro for 50 conversions per month' 
                : 'Upgrade to Pro for 50 conversions per month'}
            </p>
          </div>

          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">Usage</h2>
            <div className="mb-4">
              <span className="text-sm text-gray-400">Credits used this period</span>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold">{postsGenerated}</span>
                <span className="text-gray-400 mb-1">/ 3</span>
              </div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((postsGenerated / 3) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-900/50 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-300">Credit Usage History</h2>
          <p className="text-sm text-gray-500 mb-4">1 credit per post</p>
          
          {usageHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Post Title</th>
                    <th className="pb-3">Source</th>
                    <th className="pb-3">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {usageHistory.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-3 text-sm">{item.date}</td>
                      <td className="py-3 text-sm truncate max-w-xs">{item.title || 'N/A'}</td>
                      <td className="py-3 text-sm">{item.source || 'YouTube'}</td>
                      <td className="py-3 text-sm text-red-400">-1</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No usage history yet</p>
          )}
        </div>

        <div className="mt-8 bg-gray-900/50 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-300">Session</h2>
          <p className="text-sm text-gray-400 mb-4">Sign out of your account on this device.</p>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-medium transition"
          >
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}