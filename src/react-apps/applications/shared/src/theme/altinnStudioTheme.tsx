import { createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#1EAEF7',
    },
    secondary: {
      main: '#efefef',
      dark: '#d2d2d2',
    },
  },
  typography: {
    useNextVariants: true,
  },
});

export default theme;
