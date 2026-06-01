import React from 'react';

import { Flex, Spinner } from '@app/form-component';
import { CaretDownFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetNavigationIsPrevented } from 'src/features/navigation/utils';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useNavigationParam } from 'src/hooks/navigation';
import { useAsRef } from 'src/hooks/useAsRef';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { usePageValidation } from 'src/hooks/usePageValidation';
import { useCurrentProcessKey, useProcessingMutationWithKey } from 'src/hooks/useProcessingMutation';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/NavigationBar/NavigationBarComponent.module.css';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { NavigatePageProcessKey } from 'src/hooks/useProcessingMutation';
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

interface INavigationPageButton {
  pageId: string;
  index: number;
  current: boolean;
  disabled: boolean;
  showSpinner: boolean;
  loadingLabel: string;
  onNavigate: (pageId: string) => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}

/**
 * Memoized so that navigating between pages only re-renders the buttons whose props actually changed
 * (the previously- and newly-selected page), instead of the entire page list.
 */
const NavigationPageButton = React.memo(function NavigationPageButton({
  pageId,
  index,
  current,
  disabled,
  showSpinner,
  loadingLabel,
  onNavigate,
  buttonRef,
}: INavigationPageButton) {
  const handleClick = React.useCallback(() => onNavigate(pageId), [onNavigate, pageId]);

  return (
    <li className={classes.containerBase}>
      <NavigationButton
        disabled={disabled}
        current={current}
        onClick={handleClick}
        ref={buttonRef}
      >
        <div className={classes.buttonContent}>
          {showSpinner && (
            <Spinner
              className={classes.spinner}
              aria-label={loadingLabel}
            />
          )}
          <span>
            {index + 1}. <Lang id={pageId} />
          </span>
        </div>
      </NavigationButton>
    </li>
  );
});

export const NavigationBarComponent = ({ baseComponentId }: PropsFromGenericComponent<'NavigationBar'>) => {
  const { compact, validateOnForward, validateOnBackward } = useItemWhenType(baseComponentId, 'NavigationBar');
  const [showMenu, setShowMenu] = React.useState(false);
  const isMobile = useIsMobile() || compact === true;
  const { langAsString } = useLanguage();
  const currentPageId = useNavigationParam('pageKey') ?? '';
  const { navigateToPage, order, maybeSaveOnPageChange } = useNavigatePage();
  const onPageNavigationValidation = useOnPageNavigationValidation();
  const performProcess = useProcessingMutationWithKey<NavigatePageProcessKey>('navigate-page');
  const currentProcessKey = useCurrentProcessKey<NavigatePageProcessKey>('navigate-page');
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const loadingLabel = langAsString('general.loading');

  const { getPageValidation } = usePageValidation(baseComponentId);
  // Use component-level validation if set, otherwise fall back to page-level
  // When page-level validation is set, only validate forward navigation
  const validationOnForward = getPageValidation() ?? validateOnForward;
  const validationOnBackward = getPageValidation() ? undefined : validateOnBackward;

  const getNavigationIsPrevented = useGetNavigationIsPrevented();

  const firstPageLink = React.useRef<HTMLButtonElement | null>(null);

  // Bundle everything the click handler reads into a ref so the handler identity stays stable across
  // navigations. This lets the memoized NavigationPageButton bail out of re-rendering.
  const clickStateRef = useAsRef({
    order,
    currentPageId,
    layoutLookups,
    baseComponentId,
    maybeSaveOnPageChange,
    validationOnForward,
    validationOnBackward,
    onPageNavigationValidation,
    navigateToPage,
  });

  const handleNavigationClick = React.useCallback(
    (pageId: string) =>
      performProcess(pageId, async () => {
        const {
          order,
          currentPageId,
          layoutLookups,
          baseComponentId,
          maybeSaveOnPageChange,
          validationOnForward,
          validationOnBackward,
          onPageNavigationValidation,
          navigateToPage,
        } = clickStateRef.current;

        const currentIndex = order.indexOf(currentPageId);
        const newIndex = order.indexOf(pageId);

        const isForward = newIndex > currentIndex && currentIndex !== -1;
        const isBackward = newIndex < currentIndex && currentIndex !== -1;

        const pageKey = layoutLookups.componentToPage[baseComponentId];

        if (pageId === currentPageId || newIndex === -1 || !pageKey) {
          return;
        }

        await maybeSaveOnPageChange();

        if (isForward && validationOnForward && (await onPageNavigationValidation(pageKey, validationOnForward))) {
          // Block navigation if validation fails
          return;
        }

        if (isBackward && validationOnBackward && (await onPageNavigationValidation(pageKey, validationOnBackward))) {
          // Block navigation if validation fails
          return;
        }

        setShowMenu(false);
        navigateToPage(pageId, { skipAutoSave: true });
      }),
    [performProcess, clickStateRef],
  );

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
                <NavigationPageButton
                  key={pageId}
                  pageId={pageId}
                  index={index}
                  current={currentPageId === pageId}
                  // Note: intentionally not disabled by `isAnyProcessing`. Double-navigation is already blocked
                  // synchronously inside performProcess, and dimming every button during navigation caused the
                  // whole bar to flash.
                  disabled={getNavigationIsPrevented(pageId)}
                  showSpinner={currentProcessKey === pageId}
                  loadingLabel={loadingLabel}
                  onNavigate={handleNavigationClick}
                  buttonRef={index === 0 ? firstPageLink : undefined}
                />
              ))}
            </ul>
          )}
        </Flex>
      </Flex>
    </ComponentStructureWrapper>
  );
};
