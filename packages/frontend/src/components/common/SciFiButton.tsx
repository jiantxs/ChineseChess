import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface SciFiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'danger' | 'primary';
  size?: 'default' | 'compact' | 'small';
  showLine?: boolean;
  letterSpacing?: number;
}

export const SciFiButton = forwardRef<HTMLButtonElement, SciFiButtonProps>(
  (
    {
      variant = 'default',
      size = 'default',
      showLine = true,
      letterSpacing,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const variantClass = {
      default: '',
      danger: 'sf-btn--danger',
      primary: 'sf-btn--primary',
    }[variant];

    const sizeClass = {
      default: '',
      compact: 'sf-btn--compact',
      small: 'sf-btn--small',
    }[size];

    const defaultLetterSpacing = size === 'small' ? 2 : 6;
    const ls = letterSpacing ?? defaultLetterSpacing;

    return (
      <button
        ref={ref}
        className={`sf-btn ${variantClass} ${sizeClass} ${className}`}
        style={{ letterSpacing: ls, textIndent: ls }}
        {...props}
      >
        {showLine && <span className="sf-btn__line" />}
        <span className="sf-btn__text">{children}</span>
      </button>
    );
  }
);

SciFiButton.displayName = 'SciFiButton';
