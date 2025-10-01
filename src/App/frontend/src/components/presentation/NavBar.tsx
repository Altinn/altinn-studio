import React from 'react';

import { BackNavigationButton } from 'src/components/presentation/BackNavigationButton';
import { ExpandWidthButton } from 'src/components/presentation/ExpandWidthButton';
import classes from 'src/components/presentation/NavBar.module.css';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { PopoverNavigation } from 'src/features/navigation/PopoverNavigation';

export const NavBar = ({ showNavigation = true }: { showNavigation?: boolean }) => {
  const { langAsString } = useLanguage();
  const { hideCloseButton, showExpandWidthButton } = usePageSettings();

  return (
    <nav
      className={classes.nav}
      aria-label={langAsString('navigation.main')}
    >
      <div className={classes.wrapper}>
        {!hideCloseButton && <BackNavigationButton className={classes.buttonMargin} />}
        {showNavigation && <PopoverNavigation className={classes.buttonMargin} />}
      </div>
      {showExpandWidthButton && <ExpandWidthButton className={classes.buttonMargin} />}
    </nav>
  );
};
