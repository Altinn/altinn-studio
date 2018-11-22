import * as React from 'react';
import NavMenu from '../../shared/src/navigation/NavMenu';
import SubApp from '../../ux-editor/src/SubApp';
import './App.css';

class App extends React.Component<any, any> {
  public render() {
    return (
      <div style={{display: 'flex', width: '100%', alignItems: 'stretch'}}>
      <NavMenu/>
        <div style={{paddingLeft: 72}}>
        <SubApp />
      </div>
      </div>
    );
  }
}

export default App;
