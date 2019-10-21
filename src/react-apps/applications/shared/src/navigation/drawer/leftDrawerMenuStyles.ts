import { createStyles, Theme } from '@material-ui/core/styles';
import altinnTheme from '../../theme/altinnStudioTheme';

const drawerWidth = 240;

export const styles = (theme: Theme) => createStyles({
  listItem: {
    'fontSize': 16,
    'color': altinnTheme.altinnPalette.primary.blueDarker,
    '&:hover': {
      color: altinnTheme.altinnPalette.primary.blueDark,
      fontWeight: 500,
    },
  },
  activeListItem: {
    fontWeight: 500,
    color: altinnTheme.altinnPalette.primary.blueDark,
  },
  root: {
    display: 'absolute',
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
    top: 64,
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
    width: 8 * 7 + 1,
    [theme.breakpoints.up('sm')]: {
      width: 8 * 8 + 1,
    },
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  content: {
    flexGrow: 1,
    padding: 8 * 3,
  },
  paper: {
    position: 'absolute',
    background: altinnTheme.altinnPalette.primary.greyLight,
    top: 110,
    height: `calc(100vh - 110px)`,
    overflow: 'hidden',
  },
  listItemText: {
    paddingLeft: 0,
  },
});
