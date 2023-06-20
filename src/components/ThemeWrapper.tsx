import React from 'react';
import type { ReactNode } from 'react';

import { createTheme, ThemeProvider } from '@material-ui/core';

import { useIsMobile, useIsTablet } from 'src/hooks/useIsMobile';
import { useLanguage } from 'src/hooks/useLanguage';
import { rightToLeftISOLanguageCodes } from 'src/language/languages';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';

type ThemeWrapperProps = {
  children?: ReactNode;
};

export const ThemeWrapper = ({ children }: ThemeWrapperProps) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { selectedLanguage } = useLanguage();

  const isRtl = rightToLeftISOLanguageCodes.includes(selectedLanguage);
  const direction = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = selectedLanguage;
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
