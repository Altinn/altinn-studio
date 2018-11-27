import * as React from 'react';
export interface ISwitchProps {
  isChecked: boolean;
  toggleChange: any;
}

export class SwitchComponent
  extends React.Component<ISwitchProps, null> {

  public render() {
    return (
      <label className='switch'>
        <input
          type='checkbox'
          checked={this.props.isChecked}
          onChange={this.props.toggleChange}
        />
        <span className='slider round' />
      </label>
    );
  }
}
