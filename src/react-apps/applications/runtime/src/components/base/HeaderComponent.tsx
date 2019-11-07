import * as React from 'react';

export interface IHeaderProps {
  id: string;
  text: string;
  size?: string;
}

export interface IHeaderState { }

export class HeaderComponent extends React.Component<IHeaderProps, IHeaderState> {

  public h2style = {
    marginTop: '4.8rem',
    marginBottom: '0',
  };

  public h3style = {
    marginTop: '4.8rem',
    marginBottom: '0',
  };

  public h4style = {
    marginTop: '4.8rem',
    marginBottom: '0',
  };

  public renderHeader(): JSX.Element {
    switch (this.props.size) {
      case ('S'): {
        return <h4 id={this.props.id} style={this.h4style}>{this.props.text}</h4>;
      }

      case ('M'): {
        return <h3 id={this.props.id} style={this.h3style}>{this.props.text}</h3>;
      }

      case ('L'): {
        return <h2 id={this.props.id} style={this.h2style}>{this.props.text}</h2>;
      }

      default: {
        return <h4 id={this.props.id}>{this.props.text}</h4>;
      }
    }
  }

  public render() {
    return (
      this.renderHeader()
    );
  }
}
