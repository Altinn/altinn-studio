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
        return <h3 className='a-pageTitle' id={this.props.component.id}>{this.props.text}</h3>;
      }

      case ('M'): {
        return <h2 className='a-fontBold a-pageTitle' id={this.props.component.id}>{this.props.text}</h2>;
      }

      default: {
        return <h1 className='a-fontBold a-pageTitle' id={this.props.component.id}>{this.props.text}</h1>;
      }
    }
  }

  public render() {
    return (
      this.renderHeader()
    );
  }
}
