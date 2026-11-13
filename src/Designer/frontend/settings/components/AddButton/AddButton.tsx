import type { ReactElement } from 'react';
import { StudioButton } from '@designer/components';
import { PlusIcon } from '@designer/icons';
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
