'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { generateBlog } from '@/lib/api';
import BlogResult from './BlogResult';

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const data = await generateBlog(url);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate blog');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return <BlogResult {...result} />;
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-pink-900/20" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-transparent to-transparent" />
      
      <header className="relative z-50 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              TubeToBlog
            </span>
          </div>
          <div className="flex items-center gap-4">
            {session?.user?.email ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-sm">
                  <span>{(session.user as any)?.credits || 0} Credits</span>
                </div>
                <div className="px-3 py-1 text-sm bg-white/10 text-gray-300 border border-white/20 rounded-full">
                  Free
                </div>
                <div className="relative">
                  <button
                    onClick={() => router.push('/account')}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold overflow-hidden hover:ring-2 hover:ring-indigo-400 transition"
                  >
                    {session.user.image ? (
                      <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{session.user.email?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="p-2 text-gray-400 hover:text-white transition"
                  title="Sign out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/auth/signin')}
                className="px-5 py-2.5 text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition backdrop-blur-sm"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="min-h-[calc(100vh-80px)] flex flex-col justify-center px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm bg-white/10 border border-white/20 rounded-full backdrop-blur-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                AI-Powered Video to Blog Converter
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Transform YouTube into
                <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Viral Blog Posts
                </span>
              </h1>
              
              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                Paste any YouTube link and get an SEO-optimized, engaging blog post in seconds. 
                Built for content creators who want to dominate search rankings.
              </p>
            </div>

            <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-50 transition duration-500" />
                  <div className="relative flex items-center bg-gray-900/80 backdrop-blur-xl border border-white/20 rounded-2xl p-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste YouTube URL here..."
                      className="flex-1 px-6 py-4 bg-transparent text-lg text-white placeholder-gray-500 focus:outline-none"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          Generate
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
              </form>

              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  SEO Optimized
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Markdown Export
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Free 2 Generations
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-gray-400">Start free, upgrade when you need more</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="relative bg-gray-900/50 border border-white/20 rounded-3xl p-8 backdrop-blur-sm">
                <div className="text-sm text-gray-400 mb-2">Free</div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-gray-400">/forever</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    2 free generations
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    SEO optimized output
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Markdown export
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Basic support
                  </li>
                </ul>
                <button className="w-full py-3 text-center font-medium bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition">
                  Get Started Free
                </button>
              </div>

              <div className="relative bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/50 rounded-3xl p-8">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-sm font-semibold rounded-full">
                  Popular
                </div>
                <div className="text-sm text-indigo-300 mb-2">Pro</div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-bold">$9.90</span>
                  <span className="text-gray-400">/one-time</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    50 generations
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    All Free features
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Human-like writing mode
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Complete SEO report
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Priority support
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Credits never expire
                  </li>
                </ul>
                <button className="w-full py-3 text-center font-medium bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl transition">
                  Get Pro - $9.90
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-gray-400">Three simple steps to transform your content</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-3">Paste YouTube Link</h3>
                <p className="text-gray-400">Copy any YouTube video URL and paste it into the input box</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-3">AI Magic Happens</h3>
                <p className="text-gray-400">Our AI extracts the content and generates an SEO-optimized blog post</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-3">Export & Publish</h3>
                <p className="text-gray-400">Download as Markdown or copy directly to your blog platform</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-400 text-sm">
          <p>Built for content creators who want to maximize their reach</p>
          <p className="mt-2">© 2024 TubeToBlog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}