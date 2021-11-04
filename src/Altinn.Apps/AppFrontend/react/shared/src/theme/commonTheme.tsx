declare module '@material-ui/core/styles/createTheme' {
  // tslint:disable-next-line:interface-name
  interface Theme {
    accessibility: {
      focusVisible: {
        border: string,
      },
    };
    altinnPalette: {
      primary: {
        blueDarker: string,
        blueDark: string,
        blueMedium: string,
        blue: string,
        blueHover: string,
        blueLight: string,
        blueLighter: string,
        green: string,
        greenHover: string,
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
    sharedStyles: {
      boxShadow: string,
      linkBorderBottom: string,
      mainPaddingLeft: number,
      leftDrawerMenuClosedWidth: number,
    };
  }
}

export const commonTheme = {
  accessibility: {
    focusVisible: {
      border: '2px solid #1eaef7',
    },
  },
  altinnPalette: {
    primary: {
      blueDarker: '#022F51',
      blueDark: '#0062BA',
      blueMedium: '#008FD6',
      blue: '#1EADF7',
      blueHover: '#37b7f8',
      blueLight: '#CFF0FF',
      blueLighter: '#E3F7FF',
      green: '#12AA64',
      greenHover: '#45D489',
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
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 1025,
      lg: 1440,
      xl: 1920,
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
};
