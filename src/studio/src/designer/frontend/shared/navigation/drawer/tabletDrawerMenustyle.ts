import { createStyles } from '@material-ui/core/styles';
import altinnTheme from '../../theme/altinnStudioTheme';

const drawerWidth = 240;
const innerHover = {
  color: altinnTheme.altinnPalette.primary.blueDark,
  fontWeight: 500,
  backgroundColor: 'transparent',
};
export const styles = () => createStyles({
  drawer: {
    flexShrink: 0,
    paddingRight: 16,
  },
  divider: {
    background: 'black',
    marginLeft: 25,
  },
  nested: {
    paddingLeft: 25,
    '&:hover': innerHover,
  },
  subMenuItem: {
    fontSize: 16,
  },
  menuItemText: {
    textAlign: 'right',
    fontSize: 16,
    paddingRight: 0,
  },
  mainMenuItem: {
    fontSize: 20,
    '&:hover': innerHover,
  },
  drawerMenuPaper: {
    borderRadius: 1,
    paddingRight: 25,
    top: 92,
    width: drawerWidth,
  },
  commonButton: {
    width: 46,
    border: '2px solid #0062BA',
    borderRadius: 0,
    fontSize: 18,
    padding: '2px 8px 4px 8px',
    marginLeft: 8,
    textTransform: 'lowercase',
  },
  button: {
    color: altinnTheme.altinnPalette.primary.blueDark,
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  closeButton: {
    color: altinnTheme.altinnPalette.primary.white,
    backgroundColor: altinnTheme.altinnPalette.primary.blueDark,
    fontWeight: 400,
    '&:hover': {
      backgroundColor: altinnTheme.altinnPalette.primary.blueDark,
    },
  },
  activeListItem: {
    fontWeight: 500,
    color: altinnTheme.altinnPalette.primary.blueDark,
  },
});
