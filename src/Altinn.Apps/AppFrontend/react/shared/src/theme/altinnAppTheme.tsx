import { commonTheme } from './commonTheme';

const AltinnAppTheme = {
  ...commonTheme,
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
