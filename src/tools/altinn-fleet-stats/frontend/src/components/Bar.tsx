type Props = {
  value: number;
  max: number;
  color?: string;
  height?: number;
};

/** Tynn horisontal bar for inline-bruk i tabeller. */
export function MiniBar({
  value,
  max,
  color = 'var(--ds-color-accent-base-default)',
  height = 6,
}: Props) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role='progressbar'
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{
        width: '100%',
        height,
        background: 'var(--ds-color-neutral-surface-tinted)',
        borderRadius: 4,
        overflow: 'hidden',
        minWidth: 80,
      }}
    >
      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
    </div>
  );
}
