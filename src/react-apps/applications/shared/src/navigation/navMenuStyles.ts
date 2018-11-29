import { createStyles, Theme } from '@material-ui/core/styles';
import altinnTheme from '../theme/altinnStudioTheme';

const drawerWidth = 250;
export const styles = (theme: Theme) => createStyles({
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    top: '64 !important',
  },
  drawerClose: {
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: theme.spacing.unit * 7 + 1,
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing.unit * 9 + 1,
    },
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  hide: {
    display: 'none',
  },
  menuButton: {
    marginLeft: 12,
    marginRight: 36,
  },
  menuItemText: {
    fontSize: '1.5rem',
  },
  menuItemTextClosed: {
    visibility: 'hidden',
  },
  menuSubItemText: {
    fontSize: '1.2rem',
  },
  nested: {
    paddingLeft: theme.spacing.unit * 4,
    fontSize: '20px',
  },
  paper: {
    top: 69,
    position: 'absolute',
    background: altinnTheme.palette.secondary.main,
    height: 'calc(100% - 69px)',
  },
  root: {
    display: 'flex',
  },
  selectedMenuItem: {
    color: 'white',
    textDecoration: 'underline',
    background: altinnTheme.palette.secondary.main,
  },
  selectedMenuItemText: {
    color: 'white',
    fontWeight: 'bold',
  },
  toggleButton: {
    position: 'fixed',
    bottom: 0,
    left: 0,
  },
  toggleButtonClosed: {
    width: theme.spacing.unit * 7 + 1,
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing.unit * 9 + 1,
    },
  },
  toggleButtonOpen: {
    width: drawerWidth,
  },
  toggleMenu: {
    background: altinnTheme.palette.secondary.dark,
  },
  toggleMenuText: {
    color: 'white',
  },
});
