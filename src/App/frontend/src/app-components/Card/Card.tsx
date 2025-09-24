import React from 'react';

import { Card, Heading, Paragraph } from '@digdir/designsystemet-react';

import classes from 'src/app-components/Card/Card.module.css';

type AppCardProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  media?: React.ReactNode;
  mediaPosition?: 'top' | 'bottom';
  color?: Parameters<typeof Card>[0]['color'];
  children?: React.ReactNode;
  variant?: 'tinted' | 'default';
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
}: AppCardProps) {
  return (
    <Card
      data-color={color}
      variant={variant}
    >
      {media && mediaPosition === 'top' && <Card.Block className={classes.mediaCard}>{media}</Card.Block>}
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
      {media && mediaPosition === 'bottom' && <Card.Block className={classes.mediaCard}>{media}</Card.Block>}
    </Card>
  );
}
