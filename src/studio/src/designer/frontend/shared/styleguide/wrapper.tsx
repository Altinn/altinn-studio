import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import * as React from 'react';

import altinnTheme from '../theme/altinnStudioTheme';

const theme = createMuiTheme(altinnTheme);

export default (props: any) => {
  return (
    <MuiThemeProvider theme={theme}>
      <div>
        {props.children}
      </div>
    </MuiThemeProvider>
  );
};
