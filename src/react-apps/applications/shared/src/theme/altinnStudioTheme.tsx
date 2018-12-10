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
    MuiFormControl: {
      root: {
        border: '1px solid #BCC7CC',
        minWidth: 120,
        paddingLeft: '1em',
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