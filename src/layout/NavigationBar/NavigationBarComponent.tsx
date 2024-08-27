import React from 'react';

import { Grid, makeStyles } from '@material-ui/core';
import { CaretDownFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useIsMobile } from 'src/hooks/useIsMobile';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

const useStyles = makeStyles((theme) => ({
  menu: {
    listStyleType: 'none',
    textDecoration: 'none',
    paddingLeft: '0px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,

    [theme.breakpoints.down(600)]: {
      flexDirection: 'column',
    },
  },
  menuCompact: {
    flexDirection: 'column',
  },
  containerBase: {
    borderRadius: '40px',
    margin: 2,
    '&:active': {
      backgroundColor: theme.altinnPalette.primary.blueDark,
    },
  },
  buttonBase: {
    cursor: 'pointer',
    background: 'none',
    fontFamily: 'inherit',
    border: 'none',
    outline: `2px solid ${theme.altinnPalette.primary.blueMedium}`,
    width: '100%',
    height: '100%',
    display: 'block',
    textAlign: 'left',
    padding: '8px 14px',
    borderRadius: '40px',
    fontSize: '1rem',

    '&:hover': {
      outline: `3px solid ${theme.altinnPalette.primary.blueMedium}`,
    },
    '&:focus-within': {
      outline: 'var(--fds-focus-border-width) solid var(--fds-outer-focus-border-color)',
      outlineOffset: 'var(--fds-focus-border-width)',
      boxShadow: '0 0 0 var(--fds-focus-border-width) var(--fds-inner-focus-border-color)',
    },
  },
  buttonSelected: {
    color: theme.altinnPalette.primary.white,
    backgroundColor: theme.altinnPalette.primary.blueDarker,
  },
  hidden: {
    display: 'none !important',
  },
  dropdownMenuContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownIcon: {
    marginLeft: '0.625rem',
  },
}));

export type INavigationBar = PropsFromGenericComponent<'NavigationBar'>;

interface INavigationButton {
  onClick: () => void;
  children: React.ReactNode;
  current: boolean;
  hidden?: boolean;
}

const NavigationButton = React.forwardRef(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ onClick, hidden = false, children, current, ...rest }: INavigationButton, ref: any) => {
    const classes = useStyles();

    return (
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
    );
  },
);

NavigationButton.displayName = 'NavigationButton';

export const NavigationBarComponent = ({ node }: INavigationBar) => {
  const { compact, validateOnForward, validateOnBackward } = useNodeItem(node);
  const classes = useStyles();
  const [showMenu, setShowMenu] = React.useState(false);
  const isMobile = useIsMobile() || compact === true;
  const { langAsString } = useLanguage();
  const currentPageId = useNavigationParam('pageKey') ?? '';
  const { navigateToPage, order, maybeSaveOnPageChange } = useNavigatePage();
  const onPageNavigationValidation = useOnPageNavigationValidation();

  const firstPageLink = React.useRef<HTMLButtonElement>();

  const handleNavigationClick = async (pageId: string) => {
    setShowMenu(false);
    const currentIndex = order.indexOf(currentPageId);
    const newIndex = order.indexOf(pageId);

    const isForward = newIndex > currentIndex && currentIndex !== -1;
    const isBackward = newIndex < currentIndex && currentIndex !== -1;

    if (pageId === currentPageId || newIndex === -1) {
      return;
    }

    maybeSaveOnPageChange();

    if (isForward && validateOnForward && (await onPageNavigationValidation(node.page, validateOnForward))) {
      // Block navigation if validation fails
      return;
    }

    if (isBackward && validateOnBackward && (await onPageNavigationValidation(node.page, validateOnBackward))) {
      // Block navigation if validation fails
      return;
    }

    navigateToPage(pageId, { skipAutoSave: true });
  };

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
    <ComponentStructureWrapper node={node}>
      <Grid container>
        <Grid
          data-testid='NavigationBar'
          item
          component='nav'
          xs={12}
          role='navigation'
          aria-label={langAsString('general.navigation_form')}
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
                    current={currentPageId === pageId}
                    onClick={() => handleNavigationClick(pageId)}
                    ref={index === 0 ? firstPageLink : null}
                  >
                    {index + 1}. <Lang id={pageId} />
                  </NavigationButton>
                </li>
              ))}
            </ul>
          )}
        </Grid>
      </Grid>
    </ComponentStructureWrapper>
  );
};
