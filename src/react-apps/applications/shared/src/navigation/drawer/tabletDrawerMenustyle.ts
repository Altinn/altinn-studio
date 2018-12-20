import { createStyles, Theme } from '@material-ui/core/styles';
import altinnTheme from '../../theme/altinnStudioTheme';

const drawerWidth = '240';

export const styles = (theme: Theme) => createStyles({
  root: {
    display: 'absolute',
  },
  menuButton: {
    marginLeft: 12,
    marginRight: 20,
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  divider: {
    background: 'black',
    marginLeft: 25,
  },
  nested: {
    'paddingLeft': 25,
    '&:hover': {
      color: altinnTheme.altinnPalette.primary.blueDark,
      fontWeight: 500,
      backgroundColor: 'transparent',
    },
  },
  subMenuItem: {
    fontSize: 16,
  },
  menuItem: {
    paddingRight: 0,
  },
  menuItemText: {
    textAlign: 'right',
    fontSize: 16,
    paddingRight: 0,
  },
  mainMenuItem: {
    'fontSize': 20,
    '&:hover': {
      color: altinnTheme.altinnPalette.primary.blueDark,
      fontWeight: 500,
      backgroundColor: 'transparent',
    },
  },
  drawerMenuPaper: {
    borderRadius: 1,
    minWidth: 150,
    padding: 0,
    top: 110,
    right: 0,
  },
  button: {
    '&:hover': {
      backgroundColor: 'transparent',
    },
    'border': '2px solid #0062BA',
    'borderRadius': 0,
    'color': altinnTheme.altinnPalette.primary.blueDark,
    'fontSize': 18,
    'padding': '2px 8px 4px',
    'textTransform': 'lowercase',
  },
  closeButton: {
    '&:hover': {
      backgroundColor: altinnTheme.altinnPalette.primary.blueDark,
    },
    'border': '2px solid #0062BA',
    'borderRadius': 0,
    'backgroundColor': altinnTheme.altinnPalette.primary.blueDark,
    'color': altinnTheme.altinnPalette.primary.white,
    'fontSize': 18,
    'fontWeight': 400,
    'padding': '2px 8px 4px',
    'textTransform': 'lowercase',
  },
  activeListItem: {
    fontWeight: 500,
    color: altinnTheme.altinnPalette.primary.blueDark,
  },
});
