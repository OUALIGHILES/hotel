import { ReactNode } from 'react';
import { PMSNavbar } from './pms-navbar';

export default function PMSLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <PMSNavbar />
      <div className="flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
}