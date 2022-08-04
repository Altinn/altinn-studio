import { commonTheme } from './commonTheme';

const theme = {
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
        fontSize: 20,
        fontWeight: 500,
      },
      body1: {
        fontSize: 16,
      },
      caption: {
        fontSize: 14,
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
    leftDrawerMenuClosedWidth: 65,
  },
  typography: {
    htmlFontSize: 16,
    useNextVariants: true,
  },
};

export default theme;
