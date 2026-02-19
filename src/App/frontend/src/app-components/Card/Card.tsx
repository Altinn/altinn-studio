import React from 'react';

import { Card, Heading, Paragraph } from '@digdir/designsystemet-react';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import classes from 'src/app-components/Card/Card.module.css';

type AppCardProps = {
  title?: string;
  description?: string;
  footer?: string;
  media?: React.ReactNode;
  mediaPosition?: 'top' | 'bottom';
  color?: Parameters<typeof Card>[0]['color'];
  children?: React.ReactNode;
  variant?: 'tinted' | 'default';
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
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
  const t = useTranslation();

  return (
    <Card
      data-color={color}
      variant={variant}
      className={className}
      ref={ref}
    >
      {media && mediaPosition === 'top' && <Card.Block className={classes.mediaCard}>{media}</Card.Block>}
      <Card.Block>
        {title && <Heading data-size='md'>{t(title)}</Heading>}
        {description && <Paragraph>{t(description)}</Paragraph>}

        {children}
      </Card.Block>
      {footer && (
        <Card.Block>
          <Paragraph data-size='sm'>{t(footer)}</Paragraph>
        </Card.Block>
      )}
      {media && mediaPosition === 'bottom' && <Card.Block className={classes.mediaCard}>{media}</Card.Block>}
    </Card>
  );
}
