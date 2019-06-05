import * as React from 'react';

export interface IParagraphProps {
  id: string;
  text: string;
}

export interface IParagraphState { }

export class ParagraphComponent extends React.Component<IParagraphProps, IParagraphState> {

  public render() {
    return (
      <span id={this.props.id}>{this.props.text}</span>
    );
  }
}
