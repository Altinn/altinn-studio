import { ReactNode } from 'react';
import { Card, Heading, Paragraph } from '@digdir/designsystemet-react';

type Props = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Use compact when the empty state appears inside a small section */
  compact?: boolean;
};

const DEFAULT_ICON = (
  <svg width='48' height='48' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
    <rect
      x='3.5'
      y='5.5'
      width='17'
      height='13'
      rx='1.5'
      stroke='var(--ds-color-neutral-border-default)'
      strokeWidth='1.5'
      strokeDasharray='2 2'
    />
    <line
      x1='7'
      y1='10'
      x2='17'
      y2='10'
      stroke='var(--ds-color-neutral-border-default)'
      strokeWidth='1.5'
    />
    <line
      x1='7'
      y1='13'
      x2='13'
      y2='13'
      stroke='var(--ds-color-neutral-border-default)'
      strokeWidth='1.5'
    />
  </svg>
);

export function EmptyState({ icon, title, description, action, compact }: Props) {
  return (
    <Card>
      <Card.Block>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: compact ? '1.5rem 1rem' : '2.5rem 1.5rem',
            gap: '0.75rem',
          }}
        >
          <div style={{ opacity: 0.6 }}>{icon ?? DEFAULT_ICON}</div>
          <Heading level={3} data-size={compact ? '2xs' : 'xs'}>
            {title}
          </Heading>
          {description && (
            <Paragraph
              data-size='sm'
              style={{
                color: 'var(--ds-color-neutral-text-subtle)',
                maxWidth: '32rem',
              }}
            >
              {description}
            </Paragraph>
          )}
          {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
        </div>
      </Card.Block>
    </Card>
  );
}
