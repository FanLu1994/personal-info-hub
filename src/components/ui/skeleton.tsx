import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--color-bg-tertiary)]",
        className
      )}
      {...props}
    />
  );
}

function ArticleSkeleton() {
  return (
    <div className="p-4 border-b border-[var(--color-border-secondary)]">
      <div className="flex gap-2 mb-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-3/4 mb-3" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3 mb-3" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-full" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export { Skeleton, ArticleSkeleton, SidebarSkeleton };
