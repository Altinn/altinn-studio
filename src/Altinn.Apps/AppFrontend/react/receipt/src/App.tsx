import React from 'react';
import { createTheme, MuiThemeProvider } from '@material-ui/core';

import AltinnReceiptTheme from 'altinn-shared/theme/altinnReceiptTheme';
import Receipt from 'features/receipt/Receipt';

import './App.css';

const theme = createTheme(AltinnReceiptTheme);

export const App = () => {
  return (
    <MuiThemeProvider theme={theme}>
      <Receipt />
    </MuiThemeProvider>
  );
};
