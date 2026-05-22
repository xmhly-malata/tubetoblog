'use client';

import { useState } from 'react';

interface BlogResultProps {
  title: string;
  content: string;
  seoData: {
    keywords: string[];
    metaDescription: string;
    readabilityScore: number;
    keywordDensity: number;
  };
  videoTitle: string;
  youtubeUrl: string;
}

export default function BlogResult({ title, content, seoData, videoTitle, youtubeUrl }: BlogResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard. Please try downloading the file instead.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TubeToBlog
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            ← Generate Another
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <div className="mb-6 pb-6 border-b">
                <p className="text-sm text-gray-500 mb-2">Generated from: {videoTitle}</p>
                <h1 className="text-4xl font-bold text-gray-900">{title}</h1>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {content}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex gap-4">
                <button
                  onClick={handleCopy}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy to Clipboard
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .md
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">SEO Score Card</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Keyword Optimization</span>
                    <span className="font-medium">{Math.round(seoData.keywordDensity * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${Math.min(seoData.keywordDensity * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Readability</span>
                    <span className="font-medium">{seoData.readabilityScore}/100</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${seoData.readabilityScore}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Meta Description</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {seoData.metaDescription}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {seoData.keywords.map((keyword, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Unlock Full Features</h3>
              <p className="text-sm text-blue-100 mb-4">
                Get unlimited generations with our Pro plan
              </p>
              <button className="w-full py-3 bg-white text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition">
                Upgrade to Pro - $9.90
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
