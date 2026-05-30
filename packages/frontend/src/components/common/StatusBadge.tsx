export interface StatusBadgeProps {
  status: 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  children,
  showDot = true,
  className = '',
}: StatusBadgeProps) {
  const statusClass = {
    success: 'sf-badge--success',
    warning: 'sf-badge--warning',
    danger: 'sf-badge--danger',
    info: 'sf-badge--info',
  }[status];

  return (
    <span className={`sf-badge ${statusClass} ${className}`}>
      {showDot && <span className="sf-badge__dot" />}
      {children}
    </span>
  );
}
