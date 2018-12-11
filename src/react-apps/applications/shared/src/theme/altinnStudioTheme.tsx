const theme = {
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
    MuiTypography: {
      h1: {
        fontSize: 36,
      }
    }
  },
  palette: {
    primary: {
      main: '#0062BA',
      dark: '#022F51',
      light: '#CFF0FF',
    },
    secondary: {
      light: '#efefef',
      main: '#d2d2d2',
      dark: '#6a6a6a',
    },
  },
  typography: {
    htmlFontSize: 16,
    useNextVariants: true,
  },
};

export default theme;