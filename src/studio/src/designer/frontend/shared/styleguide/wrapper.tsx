import { createTheme, MuiThemeProvider } from '@material-ui/core/styles';
import React from 'react';

import altinnTheme from '../theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);

const Wrapper = (props: any) => {
  return (
    <MuiThemeProvider theme={theme}>
      <div>{props.children}</div>
    </MuiThemeProvider>
  );
};

export default Wrapper;
