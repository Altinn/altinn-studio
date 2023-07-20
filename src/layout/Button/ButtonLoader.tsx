import React from 'react';

import cn from 'classnames';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Button/ButtonLoader.module.css';

type ButtonLoaderProps = {
  children: React.ReactNode;
  isLoading?: boolean;
} & React.HTMLProps<HTMLDivElement>;

export const ButtonLoader = ({ children, isLoading, ...containerProps }: ButtonLoaderProps) => {
  const { langAsString } = useLanguage();

  return (
    <div
      {...containerProps}
      className={cn(classes.wrapper, containerProps.className)}
    >
      {children}
      {isLoading && (
        <AltinnLoader
          id={'altinn-button-loader'}
          className={classes['button-loader']}
          srContent={langAsString('general.loading')}
        />
      )}
    </div>
  );
};
