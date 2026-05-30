import type { ReactNode } from 'react';

export interface SciFiPanelProps {
  children: ReactNode;
  className?: string;
  showCorners?: boolean;
  cornerSize?: 'default' | 'small';
  fullscreen?: boolean;
  centered?: boolean;
  column?: boolean;
}

export function SciFiPanel({
  children,
  className = '',
  showCorners = true,
  cornerSize = 'default',
  fullscreen = false,
  centered = false,
  column = false,
}: SciFiPanelProps) {
  const classes = [
    'sf-panel',
    fullscreen && 'sf-panel--fullscreen',
    centered && 'sf-panel--center',
    column && 'sf-panel--column',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const cornerClass = cornerSize === 'small' ? 'sf-panel-corner' : 'sf-corner';

  return (
    <div className={classes}>
      {showCorners && (
        <>
          <div className={`${cornerClass} ${cornerClass}--tl`} />
          <div className={`${cornerClass} ${cornerClass}--tr`} />
          <div className={`${cornerClass} ${cornerClass}--bl`} />
          <div className={`${cornerClass} ${cornerClass}--br`} />
        </>
      )}
      {children}
    </div>
  );
}
