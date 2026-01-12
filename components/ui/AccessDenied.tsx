import React from 'react';
import { Lock } from 'lucide-react';
import Button from './Button';

const AccessDenied: React.FC<{ message?: string }> = ({ message }) => (
  <div className="min-h-[60vh] flex items-center justify-center bg-white rounded-xl border border-gray-200">
    <div className="text-center max-w-md px-6 py-10">
      <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
        <Lock className="h-6 w-6 text-red-600" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-gray-900">Access denied</h2>
      <p className="mt-2 text-sm text-gray-600">
        {message || 'You do not have permission to view this section.'}
      </p>
      <div className="mt-6 flex justify-center">
        <Button variant="secondary" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    </div>
  </div>
);

export default AccessDenied;
