import React, { useState } from 'react';
import { AnnouncementBar } from './AnnouncementBar';
import { Navbar } from './Navbar';
import { ProtocolStatusStrip } from './ProtocolStatusStrip';
import { Footer } from './Footer';
import { MobileDrawer } from './MobileDrawer';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* Accessible Skip Link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* 1. Thin top announcement bar */}
      <AnnouncementBar />

      {/* 2. Flat, full-width navbar */}
      <Navbar
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
      />

      {/* 3. Protocol status strip */}
      <ProtocolStatusStrip />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* 4. Main Page Content */}
      <main id="main-content" className="flex-1 flex flex-col route-fade-enter" tabIndex={-1}>
        {children}
      </main>

      {/* 5. Editorial Footer */}
      <Footer />
    </div>
  );
};
