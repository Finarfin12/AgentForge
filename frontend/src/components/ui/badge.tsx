import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted';
}

const variants = {
  default: 'bg-zinc-800 text-zinc-300',
  success: 'bg-green-900/60 text-green-300',
  warning: 'bg-yellow-900/60 text-yellow-300',
  error: 'bg-red-900/60 text-red-300',
  info: 'bg-blue-900/60 text-blue-300',
  muted: 'bg-zinc-800 text-zinc-500',
};

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
