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
  },
  palette: {
    primary: {
      main: '#EFEFEF',
      dark: '#022F51',
      leftMenu: '#022F51',
      blueDarker: { main: '#022F51' },
      blueDark: '#0062BA',
      blue: '#1EAEF7',
      blueLight: '#CFF0FF',
      green: '#17C96B',
      greenLight: '#D4F9E4',
      red: '#E23B53',
      redLight: '#F9CAD3',
      purple: '#3F3161',
      purpleLight: '#E0DAF7',
      yellow: '#FFDA06',
      yellowLight: '#FBF6BD',
      black: '#000',
      grey: '#6a6a6a',
      greyMedium: '#BCC7CC',
      greyLight: '#efefef',
    },
    secondary: {
      light: '#efefef',
      main: '#FFFFFF',
      dark: '#d2d2d2',
    },
  },
  typography: {
    useNextVariants: true,
  },
};

export default theme;
