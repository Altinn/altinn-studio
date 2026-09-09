import React from 'react';

import { Flex } from '@app/form-component/app-components/Flex';
import { Spinner } from '@app/form-component/app-components/Spinner';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { CaretDownFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from './NavigationBar.module.css';

export interface NavigationBarPage {
  id: string;
  disabled?: boolean;
}

export interface NavigationBarProps {
  componentId: string;
  pages: NavigationBarPage[];
  currentPageId: string;
  compact?: boolean;
  compactMenuOpen?: boolean;
  onOpenCompactMenu?: () => void;
  loadingPageId?: string;
  onNavigate: (pageId: string) => void;
}

interface NavigationButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  current: boolean;
  hidden?: boolean;
}

const NavigationButton = React.forwardRef(function NavigationButton(
  { onClick, hidden = false, children, current, className, ...rest }: NavigationButtonProps,
  ref: React.Ref<HTMLButtonElement>,
) {
  return (
    <button
      hidden={hidden}
      type='button'
      className={cn(
        classes.buttonBase,
        {
          [classes.buttonSelected]: current,
          [classes.hidden]: hidden,
        },
        className,
      )}
      onClick={onClick}
      ref={ref}
      {...(current && { 'aria-current': 'page' as const })}
      {...rest}
    >
      {children}
    </button>
  );
});

interface NavigationPageButtonProps {
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
}: NavigationPageButtonProps) {
  const { lang } = useTranslation();
  const handleClick = React.useCallback(() => onNavigate(pageId), [onNavigate, pageId]);

  return (
    <li className={classes.containerBase}>
      <NavigationButton disabled={disabled} current={current} onClick={handleClick} ref={buttonRef}>
        <div className={classes.buttonContent}>
          {showSpinner && <Spinner className={classes.spinner} aria-label={loadingLabel} />}
          <span>
            {index + 1}. {lang(pageId)}
          </span>
        </div>
      </NavigationButton>
    </li>
  );
});

export function NavigationBar({
  componentId,
  pages,
  currentPageId,
  compact = false,
  compactMenuOpen = false,
  onOpenCompactMenu,
  loadingPageId,
  onNavigate,
}: NavigationBarProps) {
  const { lang, langAsString } = useTranslation();
  const loadingLabel = langAsString('general.loading');
  const firstPageLink = React.useRef<HTMLButtonElement | null>(null);

  const shouldShowMenu = !compact || compactMenuOpen;
  const currentIndex = pages.findIndex((page) => page.id === currentPageId);

  React.useLayoutEffect(() => {
    const shouldFocusFirstItem = firstPageLink.current && compactMenuOpen;
    if (shouldFocusFirstItem) {
      firstPageLink.current?.focus();
    }
  }, [compactMenuOpen]);

  if (pages.length === 0) {
    return null;
  }

  return (
    <ComponentStructure componentId={componentId}>
      <Flex container>
        <Flex
          data-testid='NavigationBar'
          item
          component='nav'
          size={{ xs: 12 }}
          role='navigation'
          aria-label={langAsString('navigation.form')}
        >
          {compact && (
            <NavigationButton
              hidden={compactMenuOpen}
              current={true}
              onClick={() => onOpenCompactMenu?.()}
              aria-expanded={compactMenuOpen}
              aria-controls='navigation-menu'
              aria-haspopup='true'
            >
              <span className={classes.dropdownMenuContent}>
                <span>
                  {currentIndex + 1}/{pages.length} {lang(currentPageId)}
                </span>
                <CaretDownFillIcon aria-hidden='true' className={classes.dropdownIcon} />
              </span>
            </NavigationButton>
          )}
          {shouldShowMenu && (
            <ul
              id='navigation-menu'
              data-testid='navigation-menu'
              className={cn(classes.menu, {
                [classes.menuCompact]: compact,
              })}
            >
              {pages.map((page, index) => (
                <NavigationPageButton
                  key={page.id}
                  pageId={page.id}
                  index={index}
                  current={currentPageId === page.id}
                  disabled={Boolean(page.disabled)}
                  showSpinner={loadingPageId === page.id}
                  loadingLabel={loadingLabel}
                  onNavigate={onNavigate}
                  buttonRef={index === 0 ? firstPageLink : undefined}
                />
              ))}
            </ul>
          )}
        </Flex>
      </Flex>
    </ComponentStructure>
  );
}
