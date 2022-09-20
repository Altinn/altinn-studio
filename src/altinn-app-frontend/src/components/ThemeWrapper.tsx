import React from 'react';
import type { ReactNode } from 'react';

import { createTheme, ThemeProvider } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';

import { rightToLeftISOLanguageCodes } from 'altinn-shared/language/languages';
import { AltinnAppTheme } from 'altinn-shared/theme';

type ThemeWrapperProps = {
  children?: ReactNode;
};

export const ThemeWrapper = ({ children }: ThemeWrapperProps) => {
  const language = useAppSelector(appLanguageStateSelector);
  const isRtl = rightToLeftISOLanguageCodes.includes(language);
  const direction = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
  document.documentElement.dir = direction;
  return (
    <ThemeProvider
      theme={createTheme({
        ...AltinnAppTheme,
        direction,
      })}
    >
      <div className={isRtl ? 'language-dir-rtl' : ''}>{children}</div>
    </ThemeProvider>
  );
};
