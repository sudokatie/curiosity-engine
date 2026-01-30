import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-xs font-medium text-muted-olive uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            bg-bg border border-border px-3 py-2.5 text-text
            placeholder-muted-olive font-mono text-sm
            focus:outline-none focus:border-text-cream
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
