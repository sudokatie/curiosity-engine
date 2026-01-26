import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'accent' | 'discovery' | 'ok' | 'warn' | 'danger' | 'muted';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-panel-strong text-text',
  accent: 'bg-accent/20 text-accent',
  discovery: 'bg-discovery/20 text-discovery',
  ok: 'bg-ok/20 text-ok',
  warn: 'bg-warn/20 text-warn',
  danger: 'bg-danger/20 text-danger',
  muted: 'bg-border text-muted',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
