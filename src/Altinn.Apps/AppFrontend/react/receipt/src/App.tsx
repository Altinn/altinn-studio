import { createTheme, MuiThemeProvider } from '@material-ui/core';
import * as React from 'react';
import AltinnReceiptTheme from '../../shared/src/theme/altinnReceiptTheme';
import './App.css';
import Receipt from './features/receipt/containers/Receipt';

const theme = createTheme(AltinnReceiptTheme);

// eslint-disable-next-line react/prefer-stateless-function
class App extends React.Component {
  public render() {
    return (
      <MuiThemeProvider theme={theme}>
        <Receipt/>
      </MuiThemeProvider>
    );
  }
}

export default App;
