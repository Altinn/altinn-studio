import React from 'react';

import { Spinner } from '@digdir/designsystemet-react';
import { CaretDownFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/NavigationBar/NavigationBarComponent.module.css';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

interface INavigationButton {
  onClick: () => void;
  children: React.ReactNode;
  current: boolean;
  hidden?: boolean;
  disabled?: boolean;
}

const NavigationButton = React.forwardRef(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ onClick, hidden = false, children, current, ...rest }: INavigationButton, ref: any) => (
    <button
      hidden={hidden}
      type='button'
      className={cn(classes.buttonBase, {
        [classes.buttonSelected]: current,
        [classes.hidden]: hidden,
      })}
      onClick={onClick}
      ref={ref}
      {...(current && { 'aria-current': 'page' })}
      {...rest}
    >
      {children}
    </button>
  ),
);

NavigationButton.displayName = 'NavigationButton';

export const NavigationBarComponent = ({ baseComponentId }: PropsFromGenericComponent<'NavigationBar'>) => {
  const { compact, validateOnForward, validateOnBackward } = useItemWhenType(baseComponentId, 'NavigationBar');
  const [showMenu, setShowMenu] = React.useState(false);
  const isMobile = useIsMobile() || compact === true;
  const { langAsString } = useLanguage();
  const currentPageId = useNavigationParam('pageKey') ?? '';
  const { navigateToPage, order, maybeSaveOnPageChange } = useNavigatePage();
  const onPageNavigationValidation = useOnPageNavigationValidation();
  const { performProcess, isAnyProcessing, process } = useIsProcessing<string>();
  const layoutLookups = useLayoutLookups();

  const firstPageLink = React.useRef<HTMLButtonElement>(undefined);

  const handleNavigationClick = (pageId: string) =>
    performProcess(pageId, async () => {
      const currentIndex = order.indexOf(currentPageId);
      const newIndex = order.indexOf(pageId);

      const isForward = newIndex > currentIndex && currentIndex !== -1;
      const isBackward = newIndex < currentIndex && currentIndex !== -1;

      const pageKey = layoutLookups.componentToPage[baseComponentId];

      if (pageId === currentPageId || newIndex === -1 || !pageKey) {
        return;
      }

      await maybeSaveOnPageChange();

      if (isForward && validateOnForward && (await onPageNavigationValidation(pageKey, validateOnForward))) {
        // Block navigation if validation fails
        return;
      }

      if (isBackward && validateOnBackward && (await onPageNavigationValidation(pageKey, validateOnBackward))) {
        // Block navigation if validation fails
        return;
      }

      setShowMenu(false);
      navigateToPage(pageId, { skipAutoSave: true });
    });

  const shouldShowMenu = !isMobile || showMenu;

  const handleShowMenu = () => {
    setShowMenu(true);
  };

  React.useLayoutEffect(() => {
    const shouldFocusFirstItem = firstPageLink.current && showMenu;
    if (shouldFocusFirstItem) {
      firstPageLink.current?.focus();
    }
  }, [showMenu]);

  if (!order) {
    return null;
  }

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Flex container>
        <Flex
          data-testid='NavigationBar'
          item
          component='nav'
          size={{ xs: 12 }}
          role='navigation'
          aria-label={langAsString('navigation.form')}
        >
          {isMobile && (
            <NavigationButton
              hidden={showMenu}
              current={true}
              onClick={handleShowMenu}
              aria-expanded={showMenu}
              aria-controls='navigation-menu'
              aria-haspopup='true'
            >
              <span className={classes.dropdownMenuContent}>
                <span>
                  {order.indexOf(currentPageId) + 1}/{order.length} <Lang id={currentPageId} />
                </span>
                <CaretDownFillIcon
                  aria-hidden='true'
                  className={classes.dropdownIcon}
                />
              </span>
            </NavigationButton>
          )}
          {shouldShowMenu && (
            <ul
              id='navigation-menu'
              data-testid='navigation-menu'
              className={cn(classes.menu, {
                [classes.menuCompact]: isMobile,
              })}
            >
              {order.map((pageId, index) => (
                <li
                  key={pageId}
                  className={classes.containerBase}
                >
                  <NavigationButton
                    disabled={isAnyProcessing}
                    current={currentPageId === pageId}
                    onClick={() => handleNavigationClick(pageId)}
                    ref={index === 0 ? firstPageLink : null}
                  >
                    <div className={classes.buttonContent}>
                      {process === pageId && (
                        <Spinner
                          className={classes.spinner}
                          aria-label={langAsString('general.loading')}
                        />
                      )}
                      <span>
                        {index + 1}. <Lang id={pageId} />
                      </span>
                    </div>
                  </NavigationButton>
                </li>
              ))}
            </ul>
          )}
        </Flex>
      </Flex>
    </ComponentStructureWrapper>
  );
};
