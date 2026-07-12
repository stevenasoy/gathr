// Skeleton placeholders for known-shape loading states.
// Use these for lists/grids/detail pages where the final layout is known.
// For brief or boolean loading (route chunks, auth boot, form submits) use a
// spinner or inline text instead — a skeleton that doesn't match real content lies.

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

/** Matches the shape of components/VenueCard: 3/2 image + 4 text lines. */
export function VenueCardSkeleton() {
  return (
    <div className="bg-ink/[0.02] border border-ink/[0.04] p-2 rounded-3xl">
      <div className="bg-surface rounded-[18px] overflow-hidden h-full">
        <Skeleton className="aspect-[3/2] w-full rounded-none" />
        <div className="pt-3 pb-3.5" style={{ padding: '16px 14px 14px' }}>
          <Skeleton className="h-4 w-2/3 mb-2.5" />
          <Skeleton className="h-3 w-1/2 mb-1.5" />
          <Skeleton className="h-3 w-1/3 mb-1.5" />
          <Skeleton className="h-4 w-2/5 mt-2" />
        </div>
      </div>
    </div>
  )
}

/** Grid of venue card skeletons. `count` defaults to a fill that suits most viewports. */
export function VenueGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="venue-grid">
      {Array.from({ length: count }).map((_, i) => <VenueCardSkeleton key={i} />)}
    </div>
  )
}

/** Matches a booking row: title + meta lines on the left, price block on the right. */
export function RowSkeleton() {
  return (
    <div className="flex justify-between items-center gap-[18px] border border-line rounded p-[18px] px-5 bg-white flex-col md:flex-row md:items-center">
      <div className="w-full">
        <Skeleton className="h-4 w-1/3 mb-3" />
        <Skeleton className="h-3 w-1/2 mb-2" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  )
}

/** Stack of booking/message row skeletons. */
export function RowListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3.5">
      {Array.from({ length: count }).map((_, i) => <RowSkeleton key={i} />)}
    </div>
  )
}

/** Venue detail page: back link + title + meta + gallery + body + booking card. */
export function HeroSkeleton() {
  return (
    <main className="max-w-wrap mx-auto px-10 pt-[26px]">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-8 w-2/5 mb-3" />
      <Skeleton className="h-4 w-3/5 mb-5" />
      <Skeleton className="aspect-[2.4/1] w-full rounded-lg mb-7" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-[60px]">
        <div className="space-y-4">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-[420px] w-full rounded-lg" />
      </div>
    </main>
  )
}

/** Host dashboard: heading + a few pending-request rows. */
export function DashboardSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-64 mb-6" />
      <Skeleton className="h-5 w-56 mb-4" />
      <RowListSkeleton count={3} />
    </>
  )
}

/** Booking detail: back link + title/status + hero image + detail rows. */
export function BookingDetailSkeleton() {
  return (
    <main className="max-w-wrap mx-auto px-10" style={{ maxWidth: 720, paddingTop: 26, paddingBottom: 40 }}>
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="flex justify-between items-start gap-3 flex-wrap mb-4">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="aspect-[3/2] w-full rounded-lg" />
      <div className="border border-line rounded-lg bg-white mt-[22px]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-4 px-[18px] border-b border-line last:border-b-0">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </main>
  )
}

/** Messages inbox thread row: venue name + status pill + date + preview. */
export function ThreadRowSkeleton() {
  return (
    <div className="flex flex-col gap-[3px] py-3.5 px-4 border-b border-line">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-2/3 mt-0.5" />
    </div>
  )
}

/** Messages inbox aside while threads load. */
export function ThreadListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => <ThreadRowSkeleton key={i} />)}
    </>
  )
}

/** Generic form page (e.g. HostEdit): back link + heading + field blocks. */
export function FormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <main className="max-w-wrap mx-auto px-10" style={{ maxWidth: 720, paddingTop: 26, paddingBottom: 40 }}>
      <Skeleton className="h-4 w-28 mb-4" />
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-64 mb-6" />
      <div className="border border-line rounded-lg bg-white p-6 space-y-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3.5 w-24 mb-2" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </main>
  )
}