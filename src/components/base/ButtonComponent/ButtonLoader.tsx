import React from 'react';

import css from 'src/components/base/ButtonComponent/ButtonLoader.module.css';

import { AltinnLoader } from 'src/components/shared';
import { getLanguageFromKey } from 'src/utils/sharedUtils';
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
