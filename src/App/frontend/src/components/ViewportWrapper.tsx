import React from 'react';
import type { PropsWithChildren } from 'react';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsMobile, useIsTablet } from 'src/hooks/useDeviceWidths';
import { rightToLeftISOLanguageCodes } from 'src/language/languages';

export const ViewportWrapper = ({ children }: PropsWithChildren) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const selectedLanguage = useCurrentLanguage();

  const isRtl = rightToLeftISOLanguageCodes.includes(selectedLanguage);
  const direction = isRtl ? 'rtl' : 'ltr';

  // Using a layout effect to make sure the whole app is re-rendered as we want it before taking screenshots
  // for visual testing. This is needed because the visual testing library takes screenshots as soon as the viewport
  // is resized and these classes are set.
  React.useLayoutEffect(() => {
    document.documentElement.lang = selectedLanguage;
    document.documentElement.dir = direction;

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
  }, [direction, isMobile, isTablet, selectedLanguage]);

  return (
    <div
      style={
        isRtl
          ? {
              direction: 'rtl',
              textAlign: 'right',
            }
          : undefined
      }
    >
      {children}
    </div>
  );
};
