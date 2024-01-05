import React from 'react';

import { Button } from '@digdir/design-system-react';
import { Close, FullscreenEnter, FullscreenExit, Left } from '@navikt/ds-icons';
import cn from 'classnames';

import { LanguageSelector } from 'src/components/presentation/LanguageSelector';
import classes from 'src/components/presentation/NavBar.module.css';
import { useReturnToView } from 'src/features/form/layout/PageNavigationContext';
import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { PresentationType, ProcessTaskType } from 'src/types';
import { httpGet } from 'src/utils/network/networking';
import { getRedirectUrl } from 'src/utils/urls/appUrlHelper';
import { returnUrlFromQueryParameter, returnUrlToMessagebox } from 'src/utils/urls/urlHelper';

export interface INavBarProps {
  type: PresentationType | ProcessTaskType;
}

const expandIconStyle = { transform: 'rotate(45deg)' };

export const NavBar = ({ type }: INavBarProps) => {
  const { langAsString } = useLanguage();
  const { navigateToPage, previous } = useNavigatePage();
  const returnToView = useReturnToView();
  const party = useCurrentParty();
  const { expandedWidth, toggleExpandedWidth } = useUiConfigContext();
  const { hideCloseButton, showLanguageSelector, showExpandWidthButton } = usePageSettings();

  const handleBackArrowButton = () => {
    if (returnToView) {
      navigateToPage(returnToView);
    } else if (previous !== undefined && (type === ProcessTaskType.Data || type === PresentationType.Stateless)) {
      navigateToPage(previous);
    }
  };

  const handleModalCloseButton = () => {
    const queryParameterReturnUrl = returnUrlFromQueryParameter();
    const messageBoxUrl = returnUrlToMessagebox(window.location.origin, party?.partyId);
    if (!queryParameterReturnUrl && messageBoxUrl) {
      window.location.assign(messageBoxUrl);
      return;
    }

    if (queryParameterReturnUrl) {
      httpGet(getRedirectUrl(queryParameterReturnUrl))
        .then((response) => response)
        .catch(() => messageBoxUrl)
        .then((returnUrl) => {
          window.location.assign(returnUrl);
        });
    }
  };

  const showBackArrow = !!previous && (type === ProcessTaskType.Data || type === PresentationType.Stateless);
  return (
    <nav
      className={classes.nav}
      aria-label={langAsString('navigation.main')}
    >
      <div>
        {showBackArrow && (
          <Button
            data-testid='form-back-button'
            className={classes.buttonMargin}
            onClick={handleBackArrowButton}
            variant='tertiary'
            color='second'
            size='small'
            aria-label={langAsString('general.back')}
            icon={<Left aria-hidden />}
          />
        )}
      </div>
      <div className={classes.wrapper}>
        {showLanguageSelector && <LanguageSelector />}

        {showExpandWidthButton && (
          <Button
            data-testid='form-expand-button'
            className={cn(classes.buttonMargin, { [classes.hideExpandButtonMaxWidth]: !expandedWidth })}
            onClick={toggleExpandedWidth}
            variant='tertiary'
            color='second'
            size='small'
            aria-label={langAsString('general.expand_form')}
            icon={
              expandedWidth ? (
                <FullscreenExit
                  style={expandIconStyle}
                  aria-hidden
                />
              ) : (
                <FullscreenEnter
                  style={expandIconStyle}
                  aria-hidden
                />
              )
            }
          />
        )}
        {!hideCloseButton && (
          <Button
            data-testid='form-close-button'
            className={classes.buttonMargin}
            onClick={handleModalCloseButton}
            variant='tertiary'
            color='second'
            size='small'
            aria-label={langAsString('general.close_schema')}
            icon={<Close aria-hidden />}
          />
        )}
      </div>
    </nav>
  );
};
