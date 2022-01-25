import * as React from 'react';
import cn from 'classnames';
import { Grid, makeStyles, useTheme, useMediaQuery } from '@material-ui/core';

import { Triggers } from 'src/types';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { getTextResource } from '../../utils/formComponentUtils';
import { useAppDispatch, useAppSelector } from 'src/common/hooks';

const useStyles = makeStyles((theme) => ({
  menu: {
    listStyleType: 'none',
    textDecoration: 'none',
    paddingLeft: '0px !important', // ".form-group.a-form-group ul" selector is stronger
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,

    [theme.breakpoints.down(600)]: {
      flexDirection: 'column',
    },
  },
  containerBase: {
    borderRadius: '40px',

    '&:active': {
      backgroundColor: theme.altinnPalette.primary.blueDark,
    },
  },
  buttonBase: {
    cursor: 'pointer',
    background: 'none',
    font: 'inherit',
    border: `2px solid ${theme.altinnPalette.primary.blueMedium}`,
    width: '100%',
    height: '100%',
    display: 'block',
    textAlign: 'left',
    padding: '6px 12px',
    borderRadius: '40px',
    fontSize: '1.6rem',

    '&:hover': {
      outline: `2px solid ${theme.altinnPalette.primary.blueMedium}`,
    },
  },
  buttonSelected: {
    color: theme.altinnPalette.primary.white,
    backgroundColor: theme.altinnPalette.primary.blueDarker,
  },
  dropdownMenuContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownIcon: {
    marginLeft: '1rem',
    marginTop: '0 !important', // "".form-group i" selector is stronger
    fontSize: '1em !important', // "".form-group i" selector is stronger
  },
}));

export interface INavigationBar {
  triggers?: Triggers[];
}

interface INavigationButton {
  onClick: () => void;
  children: any;
  current: boolean;
  hidden?: boolean;
}

const NavigationButton = React.forwardRef(
  (
    { onClick, hidden = false, children, current, ...rest }: INavigationButton,
    ref: any,
  ) => {
    const classes = useStyles();

    return (
      <button
        hidden={hidden}
        type='button'
        className={cn(classes.buttonBase, {
          [classes.buttonSelected]: current,
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

NavigationButton.displayName = 'Button';

export const NavigationBar = ({ triggers }: INavigationBar) => {
  const classes = useStyles();
  const dispatch = useAppDispatch();
  const pageIds = useAppSelector(
    (state) => state.formLayout.uiConfig.layoutOrder,
  );
  const returnToView = useAppSelector(
    (state) => state.formLayout.uiConfig.returnToView,
  );
  const pageTriggers = useAppSelector(
    (state) => state.formLayout.uiConfig.pageTriggers,
  );
  const pageOrPropTriggers = triggers || pageTriggers;
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );
  const currentPageId: string = useAppSelector(
    (state) => state.formLayout.uiConfig.currentView,
  );
  const [showMenu, setShowMenu] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(600));
  const firstPageLink = React.useRef<HTMLButtonElement>();

  const handleNavigationClick = (pageId: string) => {
    if (pageId === currentPageId) {
      return setShowMenu(false);
    }

    const runPageValidations =
      !returnToView && pageOrPropTriggers?.includes(Triggers.ValidatePage);
    const runAllValidations =
      returnToView || pageOrPropTriggers?.includes(Triggers.ValidateAllPages);

    const runValidations =
      (runAllValidations && 'allPages') ||
      (runPageValidations && 'page') ||
      null;

    dispatch(
      FormLayoutActions.updateCurrentView({ newView: pageId, runValidations }),
    );
  };

  const shouldShowMenu = isMobile === false || showMenu;

  const handleShowMenu = React.useCallback(() => {
    setShowMenu(true);

    if (firstPageLink.current) {
      setTimeout(() => {
        firstPageLink.current.focus();
      }, 0);
    }
  }, [firstPageLink]);

  return (
    <Grid container>
      <Grid item component='nav' xs={12} role='navigation'>
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
                {pageIds.indexOf(currentPageId) + 1}/{pageIds.length}{' '}
                {getTextResource(currentPageId, textResources)}
              </span>
              <i className={cn('ai ai-arrow-down', classes.dropdownIcon)} />
            </span>
          </NavigationButton>
        )}
        <ul
          hidden={!shouldShowMenu}
          id='navigation-menu'
          className={classes.menu}
        >
          {pageIds.map((pageId, index) => {
            return (
              <li key={pageId} className={classes.containerBase}>
                <NavigationButton
                  current={currentPageId === pageId}
                  onClick={() => handleNavigationClick(pageId)}
                  ref={index === 0 ? firstPageLink : null}
                >
                  {index + 1}. {getTextResource(pageId, textResources)}
                </NavigationButton>
              </li>
            );
          })}
        </ul>
      </Grid>
    </Grid>
  );
};
