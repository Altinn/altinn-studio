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
    marginLeft: 25,
  },
  nested: {
    paddingLeft: 25,
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
    top: 110,
    right: 0,
  },
  button: {
    border: '2px solid #0062BA',
    borderRadius: 0,
    color: '#0062BA',
    fontSize: 18,
    padding: '2px 8px 4px',
    textTransform: 'lowercase',
  },
});
