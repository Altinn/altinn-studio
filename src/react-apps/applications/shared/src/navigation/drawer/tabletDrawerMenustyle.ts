import { createStyles, Theme } from '@material-ui/core/styles';

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
  },
  menuItemText: {
    textAlign: 'right',
    fontSize: 16,
  },
  mainMenuItemText: {
    fontSize: 20,
  },
  menuSubItemText: {
    fontSize: 16,
  },
  drawerMenuPaper: {
    borderRadius: 1,
    minWidth: 150,
    padding: 0,
    top: 75,
    right: 0,
  },
});
