import React from 'react';
import { Inbox, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Standard empty-state placeholder for tables, cards, lists.
 * Used when arrays are [] (e.g. backend not yet integrated).
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title = 'No data available',
  description,
  action,
  className,
  compact = false,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center w-full',
      compact ? 'py-6' : 'py-12',
      className
    )}
  >
    <div className={cn(
      'rounded-full bg-muted/50 flex items-center justify-center mb-3',
      compact ? 'w-10 h-10' : 'w-14 h-14'
    )}>
      <Icon className={cn('text-muted-foreground', compact ? 'w-5 h-5' : 'w-7 h-7')} />
    </div>
    <p className={cn('font-medium text-foreground', compact ? 'text-sm' : 'text-base')}>{title}</p>
    {description && (
      <p className={cn('text-muted-foreground mt-1 max-w-xs', compact ? 'text-xs' : 'text-sm')}>
        {description}
      </p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/**
 * Overlay shown on top of an empty Recharts chart while
 * preserving axes and layout for visual consistency.
 */
export const EmptyChartOverlay: React.FC<{ message?: string }> = ({
  message = 'No data available yet',
}) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border text-xs text-muted-foreground shadow-sm">
      {message}
    </div>
  </div>
);

export default EmptyState;
