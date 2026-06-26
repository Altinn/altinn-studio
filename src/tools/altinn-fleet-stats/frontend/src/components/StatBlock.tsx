import { ReactNode } from 'react';
import { Card, Heading, Paragraph } from '@digdir/designsystemet-react';

type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: 'default' | 'success' | 'warning' | 'danger';
};

export function StatBlock({ label, value, hint, accent = 'default' }: Props) {
  const color =
    accent === 'success'
      ? 'var(--ds-color-success-text-default)'
      : accent === 'warning'
        ? 'var(--ds-color-warning-text-default)'
        : accent === 'danger'
          ? 'var(--ds-color-danger-text-default)'
          : undefined;
  return (
    <Card>
      <Card.Block>
        <Paragraph
          data-size='xs'
          style={{ color: 'var(--ds-color-neutral-text-subtle)', marginBottom: '0.25rem' }}
        >
          {label}
        </Paragraph>
        <Heading level={3} data-size='md' style={{ color, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Heading>
        {hint && (
          <Paragraph
            data-size='xs'
            style={{ color: 'var(--ds-color-neutral-text-subtle)', marginTop: '0.25rem' }}
          >
            {hint}
          </Paragraph>
        )}
      </Card.Block>
    </Card>
  );
}
