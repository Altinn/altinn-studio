import * as React from 'react';

export interface IButtonProps {
  id: string;
  component: IFormComponent;
  text: string;
}

export class ButtonComponent
  extends React.Component<IButtonProps> {

  public render() {
    return (
      <button
        id={this.props.id}
        type='button'
        className='a-btn a-btn-success'
        disabled={this.props.component.disabled}
      >
        {this.props.text}
      </button>
    );
  }
}
