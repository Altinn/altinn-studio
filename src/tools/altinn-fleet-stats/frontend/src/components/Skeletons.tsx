import { Card, Skeleton } from '@digdir/designsystemet-react';

/** Skeleton row used while a table loads */
export function TableSkeleton({ rows = 8, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div
      style={{
        border: '1px solid var(--ds-color-neutral-border-subtle)',
        borderRadius: '0.375rem',
        background: 'var(--ds-color-neutral-background-default)',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--ds-color-neutral-surface-tinted)',
          borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={`${50 + ((i * 13) % 30)}%`} height={14} />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '1rem',
            padding: '0.65rem 1rem',
            borderBottom: r < rows - 1 ? '1px solid var(--ds-color-neutral-border-subtle)' : 'none',
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={`${30 + ((r * 11 + c * 7) % 65)}%`} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton matching the StatBlock layout */
export function StatBlockSkeleton() {
  return (
    <Card>
      <Card.Block>
        <Skeleton width='60%' height={10} style={{ display: 'block', marginBottom: '0.5rem' }} />
        <Skeleton width='40%' height={28} />
      </Card.Block>
    </Card>
  );
}

/** Multiple stat blocks side-by-side */
export function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
      {Array.from({ length: count }).map((_, i) => (
        <StatBlockSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton matching the version-list / list-row card */
export function ListCardSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <Card.Block>
        <Skeleton width='50%' height={16} style={{ display: 'block', marginBottom: '0.5rem' }} />
        <Skeleton width='80%' height={10} />
      </Card.Block>
      <Card.Block>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(110px, auto) 1fr 50px',
              gap: '0.75rem',
              alignItems: 'center',
              padding: '0.5rem 0.25rem',
              borderBottom:
                i < rows - 1 ? '1px solid var(--ds-color-neutral-border-subtle)' : 'none',
            }}
          >
            <Skeleton width={`${40 + ((i * 17) % 40)}%`} height={12} />
            <Skeleton width='100%' height={6} />
            <Skeleton width='60%' height={12} />
          </div>
        ))}
      </Card.Block>
    </Card>
  );
}

/** Generic chart placeholder — animated bars */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  const bars = [70, 35, 55, 80, 30, 45, 60, 75];
  return (
    <Card>
      <Card.Block>
        <div
          style={{
            height,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '0.5rem',
            padding: '0.5rem 0',
          }}
        >
          {bars.map((h, i) => (
            <Skeleton
              key={i}
              width='100%'
              height={`${h}%`}
              style={{ borderRadius: '0.25rem 0.25rem 0 0' }}
            />
          ))}
        </div>
      </Card.Block>
    </Card>
  );
}
