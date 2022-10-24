import { createTheme } from '@mui/material';
import { createGenerateClassName } from '@mui/styles';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';

export const generateClassName = createGenerateClassName({
  // By enabling this option, if you have non-MUI elements (e.g. `<div />`)
  // using MUI classes (e.g. `.MuiButton`) they will lose styles.
  // Make sure to convert them to use `styled()` or `<Box />` first.
  disableGlobal: true,
  // Class names will receive this seed to avoid name collisions.
  seed: 'mui-jss',
});

export const theme = createTheme(altinnTheme);
