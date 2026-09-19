import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto px-6 py-28 text-center space-y-6">
      <div className="font-mono text-xs uppercase font-extrabold tracking-widest text-sky-400">
        Error 404
      </div>
      <h1 className="font-display text-5xl font-extrabold text-text tracking-tight">
        Page Not Found
      </h1>
      <p className="text-sm text-muted leading-relaxed">
        The route you requested does not exist on VaultSplitX. Please return to the homepage or check the navigation links above.
      </p>
      <div className="pt-2">
        <Link to="/" className="btn-pill btn-pill-sky text-xs py-2.5 px-5 inline-flex items-center gap-2">
          <ArrowLeft size={14} />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
};
