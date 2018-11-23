import * as React from 'react';
import NavMenu from '../../shared/src/navigation/NavMenu';
import './App.css';

class App extends React.Component<any, any> {
  public render() {
    return (
      <div style={{display: 'flex', width: '100%', alignItems: 'stretch'}}>
      <NavMenu/>
        <div style={{paddingLeft: 72}}/>
        {/* Content here */}
      </div>
    );
  }
}

export default App;
