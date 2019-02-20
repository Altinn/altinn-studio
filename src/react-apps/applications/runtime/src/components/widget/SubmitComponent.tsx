import * as React from 'react';

export interface ISubmitProps {
  id: string;
  component: IFormComponent;
  text: string;
}

export class SubmitComponent
  extends React.Component<ISubmitProps> {

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
