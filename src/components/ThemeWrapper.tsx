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

  // Using a layout effect to make sure the whole app is re-rendered as we want it before taking screenshots
  // for visual testing. This is needed because the visual testing library takes screenshots as soon as the viewport
  // is resized and these classes are set.
  React.useLayoutEffect(() => {
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
