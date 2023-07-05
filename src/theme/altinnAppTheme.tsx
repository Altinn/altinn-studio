import { commonTheme } from 'src/theme/commonTheme';

export const AltinnAppTheme = {
  ...commonTheme,
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
