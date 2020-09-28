import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../src/theme/altinnStudioTheme';

const theme = createMuiTheme(altinnTheme);

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
