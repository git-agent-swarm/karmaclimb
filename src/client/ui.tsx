// Shared UI primitives. Mobile-first, dark slate with a Reddit-upvote-orange
// accent.

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'subtle';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-orange-500 text-white hover:bg-orange-400 active:scale-95 shadow-lg shadow-orange-500/25',
  ghost:
    'bg-white/10 text-white hover:bg-white/20 active:scale-95 border border-white/10',
  subtle: 'bg-transparent text-slate-300 hover:text-white',
};

export const Button = ({ variant = 'primary', className = '', children, ...rest }: ButtonProps) => (
  <button
    {...rest}
    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-bold transition disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer ${VARIANT[variant]} ${className}`}
  >
    {children}
  </button>
);

export const Spinner = () => (
  <div className="flex items-center justify-center py-10">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-orange-500" />
  </div>
);

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-3xl bg-white/5 border border-white/10 ${className}`}>
    {children}
  </div>
);

export const Pill = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
    {children}
  </span>
);

export const Stat = ({ label, value, icon }: { label: string; value: ReactNode; icon: string }) => (
  <div className="flex flex-col items-center rounded-2xl bg-white/5 px-3 py-3 min-w-[68px]">
    <span className="text-lg leading-none">{icon}</span>
    <span className="mt-1 text-xl font-extrabold text-white leading-none">{value}</span>
    <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
  </div>
);
