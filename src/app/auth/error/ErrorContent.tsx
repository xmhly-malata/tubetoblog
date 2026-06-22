'use client';

import { useSearchParams } from 'next/navigation';

export default function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Unknown';

  const errorMessages: Record<string, string> = {
    OAuthCallback: 'Google login callback failed. This is usually a cookie or token exchange issue.',
    OAuthSignin: 'Could not start OAuth sign-in with Google.',
    OAuthAccountNotLinked: 'This email is already linked to another sign-in method.',
    Configuration: 'NextAuth configuration error. Check environment variables.',
    AccessDenied: 'Access was denied. Please try again.',
    Verification: 'The sign-in link is no longer valid.',
    Default: 'Something went wrong during sign in.',
  };

  const message = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign-in Error</h1>
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-mono font-medium">
            {error}
          </span>
        </div>
        <p className="text-gray-500 mb-8 text-sm">{message}</p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs text-gray-400 mb-2 font-medium">Troubleshooting:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>1. Check Vercel Logs for <code className="text-red-500">NextAuth ERROR</code></li>
            <li>2. Verify <code className="text-red-500">GOOGLE_CLIENT_SECRET</code> on Vercel</li>
            <li>3. Verify <code className="text-red-500">NEXTAUTH_SECRET</code> on Vercel</li>
            <li>4. Check Google Console redirect URI matches</li>
          </ul>
        </div>
        <a
          href="/auth/signin"
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition"
        >
          Try Again
        </a>
      </div>
    </div>
  );
}
