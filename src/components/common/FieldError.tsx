import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  message?: string | null;
  className?: string;
  id?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ message, className = '', id }) => {
  if (!message) return null;
  return (
    <div id={id} className={`inline-error-msg text-rose-400 flex items-center gap-1.5 text-xs mt-1.5 font-medium ${className}`} role="alert">
      <AlertCircle size={13} className="shrink-0 text-rose-400" />
      <span>{message}</span>
    </div>
  );
};
