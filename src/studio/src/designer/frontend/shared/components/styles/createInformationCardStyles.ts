import { createStyles, Theme } from '@material-ui/core/styles';

const createInformationCardStyles = (theme: Theme, custom = {}) => createStyles({
  root: {
    height: '80vh',
  },
  paper: {
    [theme.breakpoints.up('xl')]: {
      paddingLeft: 99,
      paddingTop: 92,
      paddingBottom: 87,
      maxWidth: 1088,
      height: 446,
    },
    [theme.breakpoints.down('lg')]: {
      paddingLeft: 101,
      paddingTop: 82,
      paddingBottom: 97,
      maxWidth: 1088,
      height: 446,
    },
    [theme.breakpoints.down('md')]: {
      paddingLeft: 45,
      paddingTop: 78,
      paddingBottom: 100,
      maxWidth: 944,
      height: 446,
    },
    [theme.breakpoints.only('sm')]: {
      paddingLeft: 56,
      paddingTop: 68,
      paddingBottom: 97,
      maxWidth: 554,
      height: 623,
    },
    background: theme.altinnPalette.primary.white,
  },
  shadowBox: {
    boxShadow: '0px 4px 7px rgba(0, 0, 0, 0.14)',
  },
  header: {
    fontSize: 36,
  },
  link: {
    fontSize: 16,
  },
  smSpacing: {
    [theme.breakpoints.only('sm')]: {
      paddingBottom: 53,
    },
  },
  scrollable: {
    overflowY: 'auto',
    [theme.breakpoints.up('md')]: {
      marginBottom: '40px',
    },
    [theme.breakpoints.down('sm')]: {
      marginBottom: '-15px',
    },
  },
  ...custom,
});
export default createInformationCardStyles;
