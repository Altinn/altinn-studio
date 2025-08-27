import React, { type HTMLAttributes, type ReactElement, type ReactNode } from 'react';
import cn from 'classnames';
import { PlusIcon } from '../../../../studio-icons';
import classes from './StudioCallToActionBar.module.css';

export type StudioCallToActionBarProps = {
  children: ReactNode;
  isVisible: boolean;
  title: string;
  onClick: () => void;
  actionBarClassName?: string;
} & HTMLAttributes<HTMLDivElement>;

export const StudioCallToActionBar = ({
  title,
  isVisible,
  children,
  onClick,
  actionBarClassName,
  className: givenClassName,
  ...rest
}: StudioCallToActionBarProps): ReactElement => {
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
