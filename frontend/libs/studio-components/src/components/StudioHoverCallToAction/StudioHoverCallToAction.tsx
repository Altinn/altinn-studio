import React, { type HTMLAttributes, type ReactElement, type ReactNode } from 'react';
import cn from 'classnames';
import { PlusIcon } from '@studio/icons';
import classes from './StudioHoverCallToAction.module.css';

export type StudioHoverCallToActionProps = {
  children: ReactNode;
  isVisible: boolean;
  title: string;
  onClick: () => void;
  actionBarClassName?: string;
} & HTMLAttributes<HTMLDivElement>;

export const StudioHoverCallToAction = ({
  title,
  isVisible,
  children,
  onClick,
  actionBarClassName,
  className: givenClassName,
  ...rest
}: StudioHoverCallToActionProps): ReactElement => {
  const classNames: string = cn(classes.root, givenClassName);
  const actionContainerClassNames = cn(classes.actionContainer, actionBarClassName);
  return (
    <div {...rest} className={classNames}>
      {children}
      <div className={cn(actionContainerClassNames, { [classes.isVisible]: isVisible })}>
        <div className={classes.line}></div>
        <button className={classes.actionButton} onClick={onClick} title={title}>
          <PlusIcon fontSize='24px' />
        </button>
        <div className={classes.line}></div>
      </div>
    </div>
  );
};
