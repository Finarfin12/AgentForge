export function Spinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-8 ${className || ''}`}>
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}
