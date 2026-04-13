import type { ReactElement } from 'react';
import { StudioButton } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import classes from './AddButton.module.css';

type AddButtonProps = {
  onClick: () => void;
  children: string;
};

export const AddButton = ({ onClick, children }: AddButtonProps): ReactElement => (
  <div className={classes.addButtonWrapper}>
    <StudioButton
      variant='secondary'
      icon={<PlusIcon />}
      onClick={onClick}
      className={classes.addButton}
    >
      {children}
    </StudioButton>
  </div>
);
