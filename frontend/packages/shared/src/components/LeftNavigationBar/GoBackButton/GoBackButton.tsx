import React from 'react';
import classes from './GoBackButton.module.css';
import cn from 'classnames';
import { ArrowLeftIcon } from '@navikt/aksel-icons';
import { Paragraph } from '@digdir/design-system-react';

export type GoBackButtonProps = {
  navElementClassName: string;
  onClickBackButton: () => void;
  backButtonText: string;
};

export const GoBackButton = ({
  navElementClassName,
  onClickBackButton,
  backButtonText,
}: GoBackButtonProps) => {
  return (
    <button
      className={cn(navElementClassName, classes.backButton)}
      type='button'
      onClick={onClickBackButton}
    >
      <ArrowLeftIcon className={classes.icon} />
      <Paragraph size='small' short className={classes.buttonText}>
        {backButtonText}
      </Paragraph>
    </button>
  );
};
