"use client";
import { usePathname } from 'next/navigation';

export default function ClientWrapper({ children }) {
  const pathname = usePathname();
  const noNavPages = ['/', '/login', '/register'];
  const hideNav = noNavPages.includes(pathname);

  return (
    <div className={hideNav ? "" : "lg:pl-24 pb-[60px] md:pb-0"}>
      {children}
    </div>
  );
}
