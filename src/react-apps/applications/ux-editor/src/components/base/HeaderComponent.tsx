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
        return <h4 className='a-sectionSubTitle' id={this.props.component.id}>{this.props.text}</h4>;
      }

      case ('M'): {
        return <h3 className='a-sectionSubTitle' id={this.props.component.id}>{this.props.text}</h3>;
      }

      default: {
        return <h2 className='a-sectionTitle' id={this.props.component.id}>{this.props.text}</h2>;
      }
    }
  }

  public render() {
    return (
      this.renderHeader()
    );
  }
}
