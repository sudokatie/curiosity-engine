import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'accent' | 'discovery' | 'ok' | 'warn' | 'danger' | 'muted';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-panel-strong text-text border border-border',
  accent: 'bg-accent-muted text-accent border border-accent/30',
  discovery: 'bg-text-cream/10 text-text-cream border border-text-cream/30',
  ok: 'bg-ok/10 text-ok border border-ok/30',
  warn: 'bg-warn/10 text-warn border border-warn/30',
  danger: 'bg-danger/10 text-danger border border-danger/30',
  muted: 'bg-bg text-muted border border-border',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 text-xs font-medium uppercase tracking-wider
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
