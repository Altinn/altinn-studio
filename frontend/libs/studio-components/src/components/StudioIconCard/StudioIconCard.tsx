import React, { type ReactElement, type ReactNode } from 'react';
import {
  StudioCard,
  StudioHeading,
  StudioPopover,
  StudioPopoverContent,
  StudioPopoverTrigger,
} from '@studio/components';
import classes from './StudioIconCard.module.css';
import cn from 'classnames';
import type { HeadingProps } from '@digdir/designsystemet-react';
import { MenuElipsisVerticalIcon } from '@studio/icons';
import { studioIconCardPopoverTrigger } from '@studio/testing/testids';

export type StudioIconCardIconColors = 'blue' | 'red' | 'green' | 'grey' | 'yellow';

export type StudioIconCardProps = {
  icon: ReactElement;
  iconColor?: StudioIconCardIconColors;
  header?: string;
  headerOptions?: HeadingProps;
  contextButtons?: ReactNode;
  children: ReactNode;
};

export const StudioIconCard = ({
  icon,
  iconColor = 'grey',
  header,
  headerOptions,
  contextButtons,
  children,
}: StudioIconCardProps) => {
  return (
    <StudioCard className={classes.card}>
      {contextButtons && (
        <StudioPopover placement='bottom-start' size='sm'>
          <StudioPopoverTrigger
            data-testid={studioIconCardPopoverTrigger}
            variant='tertiary'
            className={classes.editIcon}
          >
            <MenuElipsisVerticalIcon />
          </StudioPopoverTrigger>
          <StudioPopoverContent className={classes.popoverContent}>
            {contextButtons}
          </StudioPopoverContent>
        </StudioPopover>
      )}
      <div className={classes.iconContainer}>
        <div className={cn(classes.iconBackground, classes[iconColor])} aria-hidden={true}>
          {icon}
        </div>
      </div>

      <div className={classes.content}>
        <StudioHeading className={classes.title} size='2xs' {...headerOptions}>
          {header}
        </StudioHeading>
        {children}
      </div>
    </StudioCard>
  );
};
