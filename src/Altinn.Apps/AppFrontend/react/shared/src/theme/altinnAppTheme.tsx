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
        blueLight: string,
        blueHover: string,
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

const AltinnAppTheme = {
  accessibility: {
    focusVisible: {
      border: '2px solid #1eaef7',
    },
  },
  altinnPalette: {
    // tslint:disable-next-line:max-line-length
    // These are the primary colors used in altinn: https://altinn.github.io/designsystem-styleguide/retningslinjer-altinn/farger.html
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
      h2: {
        fontSize: 28,
      },
      h3: {
        fontSize: 20,
      },
      body1: {
        fontSize: 16,
      },
      body2: {
        fontSize: 14,
      },
      caption: {
        fontSize: 14,
      },
      subtitle1: {
        fontSize: 14,
      },
    },
    MuiPickersToolbar: {
      toolbar: {
        backgroundColor: '#022F51',
        height: '96px',
      },
    },
    MuiPickersToolbarText: {
      toolbarTxt: {
        color: '#fff',
      },
    },
    MuiPickersCalendarHeader: {
      dayLabel: {
        color: '#6A6A6A',
      },
    },
    MuiPickersDay: {
      daySelected: {
        backgroundColor: '#022F51',
      },
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
  props: {
    MuiButtonBase: {
      disableRipple: true,
      disableTouchRipple: true,
    },
  },
  sharedStyles: {
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
    linkBorderBottom: '1px solid #0062BA',
    mainPaddingLeft: 73,
    fontWeight: {
      medium: 500,
    },
  },
  typography: {
    htmlFontSize: 16,
    useNextVariants: true,
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      'Altinn-DIN',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
};

export default AltinnAppTheme;
