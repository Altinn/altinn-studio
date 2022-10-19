import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material';

import altinnTheme from '../theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);

const Wrapper = (props: any) => {
  return (
    <ThemeProvider theme={theme}>
      <div>{props.children}</div>
    </ThemeProvider>
  );
};

export default Wrapper;
