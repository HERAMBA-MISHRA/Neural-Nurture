"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.push('/login');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
            <div className="text-primary font-bold animate-pulse">Redirecting to Secure Portal...</div>
        </div>
    );
}
