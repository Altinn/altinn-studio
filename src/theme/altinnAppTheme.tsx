export const AltinnAppTheme = {
  accessibility: {
    focusVisible: {
      border: '2px solid #1eaef7',
    },
  },
  altinnPalette: {
    primary: {
      blueDarker: '#022F51',
      blueDark: '#0062BA',
      blueDarkHover: '#1A72C1',
      blueMedium: '#008FD6',
      blue: '#1EADF7',
      blueHover: '#37b7f8',
      blueLight: '#CFF0FF',
      blueLighter: '#E3F7FF',
      green: '#12AA64',
      greenHover: '#45D489',
      greenLight: '#D4F9E4',
      red: '#D5203B',
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
      transparentBlue: 'rgba(227, 247, 255, 0.5)',
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
    fontFamily: 'inherit',
    h1: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
    caption: {
      fontSize: '0.875rem',
    },
    subtitle1: {
      fontSize: '0.875rem',
    },
  },
};
