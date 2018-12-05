import { createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 1025,
      lg: 1440,
      xl: 1920,
    },
  },
  overrides: {
    MuiToolbar: {
      regular: {
        '@media (min-width: 600px)': {
          minHeight: 55,
        },
      },
    },
  },
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
    fontSize: 16,
    useNextVariants: true,
  },
});

export default theme;
