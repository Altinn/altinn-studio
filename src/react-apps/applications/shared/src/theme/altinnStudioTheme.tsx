declare module '@material-ui/core/styles/createMuiTheme' {
  // tslint:disable-next-line:interface-name
  interface Theme {
    altinnPalette: {
      primary: {
        blueDarker: string,
        blueDark: string,
        blue: string,
        blueLight: string,
        green: string,
        greenLight: string,
        red: string,
        redLight: string,
        purple: string,
        purpleLight: string,
        yellow: string,
        yellowLight: string,
        black: string,
        grey: string,
        greyMedium: string,
        greyLight: string,
        white: string,
      },
    };
  }
}

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
      },
    },
  },
  altinnPalette: {
    // tslint:disable-next-line:max-line-length
    // These are the primary colors used in altinn: https://altinn.github.io/designsystem-styleguide/retningslinjer-altinn/farger.html
    primary: {
      blueDarker: '#022F51',
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
      greyLight: '#EFEFEF',
      white: '#FFF',
    },
  },
  palette: {
    primary: {
      main: '#000',
    },
    // Colors that are not part of the altinn color palette but is still used
    secondary: {
      main: '#000',
      dark: '#d2d2d2',
    },
  },
  typography: {
    htmlFontSize: 16,
    useNextVariants: true,
  },
};

export default theme;
