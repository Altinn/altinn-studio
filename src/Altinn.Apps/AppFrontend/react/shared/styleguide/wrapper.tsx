import { createTheme, MuiThemeProvider } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../src/theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);

// import injectTapEventPlugin from 'react-tap-event-plugin';
// injectTapEventPlugin();

export default class Wrapper extends React.Component {
  public render() {
    return (
      <MuiThemeProvider theme={theme}>
        <div>
          {this.props.children}
        </div>
      </MuiThemeProvider>
    );
  }
}
