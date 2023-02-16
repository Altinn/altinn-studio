import React from 'react';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import css from 'src/layout/Button/ButtonLoader.module.css';
import type { ILanguage } from 'src/types/shared';

export interface ButtonLoaderProps {
  language: ILanguage;
}

export const ButtonLoader = ({ language }: ButtonLoaderProps) => {
  return (
    <AltinnLoader
      id={'altinn-button-loader'}
      className={css['button-loader']}
      srContent={getLanguageFromKey('general.loading', language)}
    />
  );
};
