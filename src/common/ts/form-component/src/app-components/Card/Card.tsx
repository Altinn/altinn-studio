import type { ReactNode, Ref } from 'react';

import { Card, type CardProps, Heading, Paragraph } from '@digdir/designsystemet-react';

import classes from './Card.module.css';

export type AppCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  media?: ReactNode;
  mediaPosition?: 'top' | 'bottom';
  color?: CardProps['data-color'];
  children?: ReactNode;
  variant?: 'tinted' | 'default';
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export function AppCard({
  title,
  description,
  footer,
  media,
  color = 'neutral',
  mediaPosition = 'top',
  children,
  variant = 'tinted',
  className,
  ref,
}: AppCardProps) {
  return (
    <Card data-color={color} variant={variant} className={className} ref={ref}>
      {media && mediaPosition === 'top' && (
        <Card.Block className={classes.mediaCard}>{media}</Card.Block>
      )}
      <Card.Block>
        {title && <Heading data-size='md'>{title}</Heading>}
        {description && <Paragraph>{description}</Paragraph>}
        {children}
      </Card.Block>
      {footer && (
        <Card.Block>
          <Paragraph data-size='sm'>{footer}</Paragraph>
        </Card.Block>
      )}
      {media && mediaPosition === 'bottom' && (
        <Card.Block className={classes.mediaCard}>{media}</Card.Block>
      )}
    </Card>
  );
}
