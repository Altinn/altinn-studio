import { createTheme, MuiThemeProvider } from '@material-ui/core/styles';
import React from 'react';

import altinnTheme from '../../shared/src/theme/altinnStudioTheme';
const theme = createTheme(altinnTheme);

interface IWrapperProps {
  children: React.ReactNode;
}

const Wrapper = ({ children }: IWrapperProps) => {
  return (
    <MuiThemeProvider theme={theme}>
      <div>{children}</div>
    </MuiThemeProvider>
  );
};

export default Wrapper;
