import React from 'react';
import type { ReactNode } from 'react';

import { createTheme, ThemeProvider } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { rightToLeftISOLanguageCodes } from 'src/language/languages';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';

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
