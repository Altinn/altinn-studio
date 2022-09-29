import React from 'react';

import css from 'src/components/base/ButtonComponent/ButtonLoader.module.css';

import { AltinnLoader } from 'altinn-shared/components';
import { getLanguageFromKey } from 'altinn-shared/utils';
import type { ILanguage } from 'altinn-shared/types';

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
