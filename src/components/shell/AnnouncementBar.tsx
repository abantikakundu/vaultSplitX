import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  return (
    <div className="announcement-bar" role="region" aria-label="Announcement">
      <ShieldCheck size={14} className="text-sky-400" aria-hidden="true" />
      <span className="font-semibold">
        Built on Midnight. Confidential payment distribution with verifiable accounting.
      </span>
    </div>
  );
};
