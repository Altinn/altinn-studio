import React from 'react';

import { Button } from '@digdir/designsystemet-react';
import { Close, FullscreenEnter, FullscreenExit, Left } from '@navikt/ds-icons';
import cn from 'classnames';

import { LanguageSelector } from 'src/components/presentation/LanguageSelector';
import classes from 'src/components/presentation/NavBar.module.css';
import { useReturnToView } from 'src/features/form/layout/PageNavigationContext';
import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { useNavigatePage, usePreviousPageKey } from 'src/hooks/useNavigatePage';
import { PresentationType, ProcessTaskType } from 'src/types';
import { httpGet } from 'src/utils/network/networking';
import { getRedirectUrl } from 'src/utils/urls/appUrlHelper';
import { returnUrlToMessagebox } from 'src/utils/urls/urlHelper';

export interface INavBarProps {
  type: PresentationType | ProcessTaskType;
}

const expandIconStyle = { transform: 'rotate(45deg)' };

export const NavBar = ({ type }: INavBarProps) => {
  const { langAsString } = useLanguage();
  const previous = usePreviousPageKey();
  const { navigateToPage } = useNavigatePage();
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

  const handleModalCloseButton = async () => {
    const queryParameterReturnUrl = new URLSearchParams(window.location.search).get('returnUrl');

    const messageBoxUrl = returnUrlToMessagebox(window.location.origin, party?.partyId);

    if (queryParameterReturnUrl) {
      const returnUrl =
        (await httpGet<string>(getRedirectUrl(queryParameterReturnUrl)).catch((_e) => null)) ?? messageBoxUrl;
      returnUrl && window.location.assign(returnUrl);
    } else if (messageBoxUrl) {
      window.location.assign(messageBoxUrl);
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
            icon={true}
          >
            <Left
              fontSize='1rem'
              aria-hidden
            />
          </Button>
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
            icon={true}
          >
            {expandedWidth ? (
              <FullscreenExit
                fontSize='1rem'
                style={expandIconStyle}
                aria-hidden
              />
            ) : (
              <FullscreenEnter
                fontSize='1rem'
                style={expandIconStyle}
                aria-hidden
              />
            )}
          </Button>
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
            icon={true}
          >
            <Close
              fontSize='1rem'
              aria-hidden
            />
          </Button>
        )}
      </div>
    </nav>
  );
};
