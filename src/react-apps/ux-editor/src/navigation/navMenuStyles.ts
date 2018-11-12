import { createStyles, Theme } from '@material-ui/core/styles';

const drawerWidth = 250;
export const styles = (theme: Theme) => createStyles({
  root: {
    display: 'flex',
  },
  menuButton: {
    marginLeft: 12,
    marginRight: 36,
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    top: '64 !important',
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
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
  paper: {
    top: 69,
    position: 'absolute',
    background: 'lightgrey',
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
  nested: {
    paddingLeft: theme.spacing.unit * 4,
    fontSize: '20px',
  },
  menuItemText: {
    fontSize: '1.5rem',
  },
  menuSubItemText: {
    fontSize: '1.2rem',
  },
  toggleMenuText: {
    color: 'white',
  },
  toggleMenu: {
    background: 'grey',
  },
  menuItemTextClosed: {
    visibility: 'hidden',
  },
  selectedMenuItem: {
    color: 'white',
    textDecoration: 'underline',
    background: 'grey',
  },
  selectedMenuItemText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
