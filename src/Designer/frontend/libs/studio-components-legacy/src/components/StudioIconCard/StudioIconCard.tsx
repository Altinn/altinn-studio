import React, { type ReactElement, type ReactNode } from 'react';
import {
  StudioCard,
  StudioPopover,
  StudioPopoverContent,
  StudioPopoverTrigger,
} from '@studio/components-legacy';
import classes from './StudioIconCard.module.css';
import cn from 'classnames';
import type { HeadingProps } from '@digdir/designsystemet-react';
import { MenuElipsisVerticalIcon } from '@studio/icons';

export type StudioIconCardIconColors = 'blue' | 'red' | 'green' | 'grey' | 'yellow';

export type StudioIconCardProps = {
  icon: ReactElement;
  iconColor?: StudioIconCardIconColors;
  menuButtonTitle?: string;
  header?: string;
  headerOptions?: HeadingProps;
  contextButtons?: ReactNode;
  children: ReactNode;
  className?: string;
};

export const StudioIconCard = ({
  icon,
  iconColor = 'grey',
  menuButtonTitle,
  contextButtons,
  children,
  className,
}: StudioIconCardProps) => {
  return (
    <StudioCard className={cn(classes.card, className)}>
      {contextButtons && (
        <StudioPopover placement='bottom-start' size='sm'>
          <StudioPopoverTrigger
            title={menuButtonTitle}
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

      <div className={classes.content}>{children}</div>
    </StudioCard>
  );
};
