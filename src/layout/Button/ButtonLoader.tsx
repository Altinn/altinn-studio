import React from 'react';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import classes from 'src/layout/Button/ButtonLoader.module.css';
import type { ILanguage } from 'src/types/shared';

export interface ButtonLoaderProps {
  language: ILanguage;
}

export const ButtonLoader = ({ language }: ButtonLoaderProps) => (
  <AltinnLoader
    id={'altinn-button-loader'}
    className={classes['button-loader']}
    srContent={getLanguageFromKey('general.loading', language)}
  />
);
