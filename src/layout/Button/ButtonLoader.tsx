import React from 'react';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Button/ButtonLoader.module.css';

export const ButtonLoader = () => {
  const { langAsString } = useLanguage();

  return (
    <AltinnLoader
      id={'altinn-button-loader'}
      className={classes['button-loader']}
      srContent={langAsString('general.loading')}
    />
  );
};
