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
  overrides: {
    MuiFormControl: {
      root: {
        border: '1px solid #BCC7CC',
        minWidth: 120,
        paddingLeft: '1em',
      },
    },
  },
});

export default theme;
