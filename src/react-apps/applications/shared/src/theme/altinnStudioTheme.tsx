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
      subtitle1: {
        fontSize: 16,
      },
    },
  },
  palette: {
    primary: {
      main: '#EFEFEF',
      light: '#efefef',
      leftMenu: ' #E5E5E5',
    },
    secondary: {
      light: '#efefef'
      main: '#FFFFFF',
      dark: '#d2d2d2',
    },
  },
  typography: {
    fontSize: 16,
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
