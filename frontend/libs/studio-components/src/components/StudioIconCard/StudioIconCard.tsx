import React, { type ReactElement } from 'react';
import { StudioCard, StudioHeading, StudioLink, StudioParagraph } from '@studio/components';
import classes from './StudioIconCard.module.css';
import cn from 'classnames';
import type { HeadingProps, ParagraphProps } from '@digdir/designsystemet-react';
import { PencilIcon } from '@studio/icons';

export type StudioIconCardIconColors = 'blue' | 'red' | 'green' | 'grey' | 'yellow';

type StudioIconCardProps = {
  icon: ReactElement;
  iconColor?: StudioIconCardIconColors;
  linkHref?: string;
  header?: string;
  headerOptions?: HeadingProps;
  description?: string;
  descriptionOptions?: ParagraphProps;
};

export const StudioIconCard = ({
  icon,
  iconColor = 'grey',
  linkHref,
  header,
  headerOptions,
  description,
  descriptionOptions,
}: StudioIconCardProps) => {
  return (
    <StudioCard className={classes.card}>
      <StudioLink href={linkHref} className={classes.link}>
        <div className={classes.editIcon}>
          <PencilIcon />
        </div>
        <div className={classes.iconContainer}>
          <div className={cn(classes.iconBackground, classes[iconColor])}>{icon}</div>
        </div>

        <div className={classes.content}>
          <StudioHeading className={classes.title} size='2xs' {...headerOptions}>
            {header}
          </StudioHeading>

          <StudioParagraph size='xs' className={classes.desc} {...descriptionOptions}>
            {description}
          </StudioParagraph>
        </div>
      </StudioLink>
    </StudioCard>
  );
};
