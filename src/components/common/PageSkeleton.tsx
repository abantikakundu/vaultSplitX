import React from 'react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 space-y-8 animate-pulse" aria-label="Loading page">
      <div className="h-10 bg-surface border border-border rounded max-w-md" />
      <div className="h-4 bg-surface border border-border rounded max-w-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="h-48 bg-surface border border-border rounded" />
        <div className="h-48 bg-surface border border-border rounded" />
        <div className="h-48 bg-surface border border-border rounded" />
      </div>
    </div>
  );
};
