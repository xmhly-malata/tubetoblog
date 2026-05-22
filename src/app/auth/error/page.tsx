export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
        <p className="text-gray-400 mb-8">Something went wrong during sign in. Please try again.</p>
        <a
          href="/auth/signin"
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 font-medium rounded-xl transition"
        >
          Try Again
        </a>
      </div>
    </div>
  );
}