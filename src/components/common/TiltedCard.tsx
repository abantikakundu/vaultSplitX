import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TiltedCardProps {
  label: string;
  value: string;
  bgClass: 'card-bg-pink' | 'card-bg-indigo' | 'card-bg-mint' | 'card-bg-white';
  Icon: LucideIcon;
  className?: string;
  subtext?: string;
}

export const TiltedCard: React.FC<TiltedCardProps> = ({
  label,
  value,
  bgClass,
  Icon,
  className = '',
  subtext,
}) => {
  return (
    <div className={`tilted-cluster-card ${bgClass} ${className}`}>
      <div className="flex items-center justify-between text-[11px] font-bold tracking-widest uppercase mb-2">
        <span>{label}</span>
      </div>

      <div className="font-display text-2xl font-extrabold tracking-tight mb-1">
        {value}
      </div>

      {subtext && (
        <div className="text-[11px] opacity-80 font-mono mt-1">
          {subtext}
        </div>
      )}

      <div className="card-corner-icon" aria-hidden="true">
        <Icon size={72} strokeWidth={1.5} />
      </div>
    </div>
  );
};
