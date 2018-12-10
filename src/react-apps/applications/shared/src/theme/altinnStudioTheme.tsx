import { createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#1EAEF7',
      dark: '#022F51',
    },
    secondary: {
      light: '#efefef',
      main: '#d2d2d2',
      dark: '#6a6a6a',
    },
  },
  typography: {
    useNextVariants: true,
  },
});

export default theme;
