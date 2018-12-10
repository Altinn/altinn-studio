import * as React from 'react';

export interface IHeaderProps {
  component: IFormComponent;
  text: string;
  size?: string;
}

export interface IHeaderState { }

export class HeaderComponent extends React.Component<IHeaderProps, IHeaderState> {

  public renderHeader(): JSX.Element {
    switch (this.props.size) {
      case ('S'): {
        return <h4 id={this.props.component.id}>{this.props.text}</h4>;
      }

      case ('M'): {
        return <h3 id={this.props.component.id}>{this.props.text}</h3>;
      }

      case ('L'): {
        return <h2 id={this.props.component.id}>{this.props.text}</h2>;
      }

      default: {
        return <h4 id={this.props.component.id}>{this.props.text}</h4>;
      }
    }
  }

  public render() {
    return (
      this.renderHeader()
    );
  }
}
