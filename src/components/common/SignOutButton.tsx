'use client';

import { signOut } from 'next-auth/react';

type SignOutButtonProps = {
  className?: string;
};

export default function SignOutButton({ className = '' }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={`inline-flex items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-border)] hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${className}`}
    >
      로그아웃
    </button>
  );
}
