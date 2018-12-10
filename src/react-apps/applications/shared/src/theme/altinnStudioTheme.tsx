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
      h4: {
        fontSize: 36,
      },
      h5: {
        fontSize: 24,
      },
      h6: {
        fontSize: 18,
      },
      subtitle2: {
        fontSize: 16,
      },
      body1: {
        fontSize: 14,
      },
      body2: {
        fontSize: 14,
        fontWeight: 500,
      }
    }
  },
  palette: {
    primary: {
      main: '#022F51',
      dark: '#0062BA',
      //todo: should this be: light: '#1EAEF7',?
      light: '#CFF0FF',
    },
    secondary: {
      main: '#efefef',
      dark: '#d2d2d2',
    },
  },
  typography: {
    htmlFontSize: 16,
    useNextVariants: true,
  },
};

export default theme;