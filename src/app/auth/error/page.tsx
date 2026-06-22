import { Suspense } from 'react';
import ErrorContent from './ErrorContent';

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ErrorContent />
    </Suspense>
  );
}
