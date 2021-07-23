import { createTheme, MuiThemeProvider } from '@material-ui/core/styles';
import * as React from 'react';

import altinnTheme from '../theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);

export default (props: any) => {
  return (
    <MuiThemeProvider theme={theme}>
      <div>
        {props.children}
      </div>
    </MuiThemeProvider>
  );
};
