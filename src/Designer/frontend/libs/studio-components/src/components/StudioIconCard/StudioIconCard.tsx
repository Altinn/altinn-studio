import React, { forwardRef } from 'react';
import type { ReactElement, ReactNode, Ref } from 'react';
import type { HeadingProps } from '@digdir/designsystemet-react';
import { StudioPopoverTrigger } from '../StudioPopover/StudioPopover';
import { MenuElipsisVerticalIcon } from '@studio/icons';
import classes from './StudioIconCard.module.css';
import { StudioPopover } from '../StudioPopover';
import { StudioCard } from '../StudioCard';
import cn from 'classnames';

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

function StudioIconCard(
  {
    icon,
    iconColor = 'grey',
    menuButtonTitle,
    contextButtons,
    children,
    className,
  }: StudioIconCardProps,
  ref?: Ref<HTMLDivElement>,
): ReactElement {
  return (
    <StudioCard className={cn(classes.card, className)} ref={ref}>
      {contextButtons && (
        <StudioPopover.TriggerContext>
          <div className={classes.editIcon}>
            <StudioPopoverTrigger title={menuButtonTitle} variant='tertiary'>
              <MenuElipsisVerticalIcon />
            </StudioPopoverTrigger>
          </div>
          <StudioPopover placement='bottom-end' data-size='sm'>
            {contextButtons}
          </StudioPopover>
        </StudioPopover.TriggerContext>
      )}
      <div className={classes.iconContainer}>
        <div className={cn(classes.iconBackground, classes[iconColor])} aria-hidden>
          {icon}
        </div>
      </div>
      <div className={classes.content}>{children}</div>
    </StudioCard>
  );
}

const ForwardedStudioIconCard = forwardRef(StudioIconCard);

export { ForwardedStudioIconCard as StudioIconCard };
