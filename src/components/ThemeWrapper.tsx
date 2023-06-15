import React from 'react';
import type { ReactNode } from 'react';

import { createTheme, ThemeProvider } from '@material-ui/core';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useIsMobile, useIsTablet } from 'src/hooks/useIsMobile';
import { rightToLeftISOLanguageCodes } from 'src/language/languages';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';

type ThemeWrapperProps = {
  children?: ReactNode;
};

export const ThemeWrapper = ({ children }: ThemeWrapperProps) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const language = useAppSelector(appLanguageStateSelector);

  const isRtl = rightToLeftISOLanguageCodes.includes(language);
  const direction = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
  document.documentElement.dir = direction;

  React.useEffect(() => {
    const documentClasses = {
      'viewport-is-mobile': isMobile,
      'viewport-is-tablet': isTablet && !isMobile,
      'viewport-is-desktop': !isTablet && !isMobile,
    };

    for (const [key, value] of Object.entries(documentClasses)) {
      if (value) {
        document.documentElement.classList.add(key);
      } else {
        document.documentElement.classList.remove(key);
      }
    }
  }, [isMobile, isTablet]);

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
