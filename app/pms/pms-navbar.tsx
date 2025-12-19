'use client';

import { Package, Calendar, CreditCard, Settings, Globe } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function PMSNavbar() {
  const pathname = usePathname();

  return (
    <div className="hidden border-r bg-muted/40 md:block w-64">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Package className="h-6 w-6" />
            <span className="">PMS Dashboard</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
            <Link
              href="/pms"
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                pathname === '/pms' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline',
                'justify-start'
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              Overview
            </Link>
            <Link
              href="/pms/channex"
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                pathname === '/pms/channex' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline',
                'justify-start'
              )}
            >
              <Globe className="mr-2 h-4 w-4" />
              Channex
            </Link>
            <Link
              href="/pms/bookings"
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                pathname === '/pms/bookings' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline',
                'justify-start'
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Bookings
            </Link>
            <Link
              href="/pms/availability"
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                pathname === '/pms/availability' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline',
                'justify-start'
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Availability
            </Link>
            <Link
              href="/pms/rates"
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                pathname === '/pms/rates' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline',
                'justify-start'
              )}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Rates
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}