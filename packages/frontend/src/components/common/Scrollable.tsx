import type { ReactNode, CSSProperties } from 'react';

export interface ScrollableProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'wide';
  style?: CSSProperties;
}

export function Scrollable({
  children,
  className = '',
  variant = 'default',
  style,
}: ScrollableProps) {
  const variantClass = variant === 'wide' ? 'sf-scrollbar--wide' : '';

  return (
    <div className={`sf-scrollbar ${variantClass} ${className}`} style={style}>
      {children}
    </div>
  );
}
