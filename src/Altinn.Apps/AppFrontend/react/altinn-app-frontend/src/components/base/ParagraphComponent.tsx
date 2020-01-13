import * as React from 'react';

export interface IParagraphProps {
  id: string;
  text: string;
}

export interface IParagraphState { }

export class ParagraphComponent extends React.Component<IParagraphProps, IParagraphState> {

  public style = {
    marginTop: '2.4rem',
  };

  public render() {
    return (
      <span id={this.props.id} style={this.style}>{this.props.text}</span>
    );
  }
}
