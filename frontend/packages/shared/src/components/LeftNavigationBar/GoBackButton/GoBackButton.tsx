import React from 'react';
import classes from './GoBackButton.module.css';
import cn from 'classnames';
import { ArrowLeftIcon } from '@navikt/aksel-icons';
import { Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export type GoBackButtonProps = {
  navElementClassName: string;
  onClickBackButton: () => void;
};

export const GoBackButton = ({ navElementClassName, onClickBackButton }: GoBackButtonProps) => {
  const { t } = useTranslation();

  return (
    <button
      className={cn(navElementClassName, classes.backButton)}
      type='button'
      onClick={onClickBackButton}
    >
      <ArrowLeftIcon className={classes.icon} />
      <Paragraph size='small' short className={classes.buttonText}>
        {t('left_navigation_bar.back_button')}
      </Paragraph>
    </button>
  );
};
