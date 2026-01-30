import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-text-cream text-bg hover:bg-white rounded-md',
  secondary: 'bg-panel border border-border text-text hover:bg-panel-strong hover:border-border-strong',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-panel',
  danger: 'bg-danger text-white hover:bg-red-600',
  accent: 'bg-accent text-white hover:bg-accent-hover',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-text-cream focus:ring-offset-2 focus:ring-offset-bg
          disabled:opacity-50 disabled:cursor-not-allowed
          tracking-wide uppercase text-sm
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
