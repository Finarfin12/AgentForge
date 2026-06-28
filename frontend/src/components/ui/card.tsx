import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div className={cn('rounded-xl border border-zinc-800 bg-zinc-900', className)} onClick={onClick}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('px-5 py-4 border-b border-zinc-800', className)}>{children}</div>
  );
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: CardProps) {
  return <h3 className={cn('text-sm font-semibold text-white', className)}>{children}</h3>;
}
