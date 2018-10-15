import * as React from 'react';
import { connect } from 'react-redux';

export interface IFormComponentHandlerProvidedProps {
  id: string;
  handleDataUpdate: (data: any) => void;
  component: IFormComponent;
}

export interface IFormComponentHandlerProps extends IFormComponentHandlerProvidedProps {
  textResources: any[];
  designMode: boolean;
}

export const formComponentWithHandlers = (WrappedComponent: React.ComponentType<any>): React.ComponentClass<any> => {
  class FormComponentWithHandlers extends React.Component<IFormComponentHandlerProps> {

    public handleDataUpdate = (data: any) => this.props.handleDataUpdate(data);

    public getTextResource = (resourceKey: string): any[] => {
      return this.props.textResources.find(resource => resource.id === resourceKey);
    }

    public render(): JSX.Element {
      const { id, ...passThroughProps } = this.props;

      const text = this.props.designMode ? this.props.component.title
        : this.getTextResource(this.props.component.title);
      return (
        <WrappedComponent
          handleDataChange={this.handleDataUpdate}
          text={text}
          size={this.props.component.size}
          {...passThroughProps}
        />
      );
    }
  }

  const mapStateToProps: (state: IAppState, props: IFormComponentHandlerProvidedProps) =>
    IFormComponentHandlerProps = (state: IAppState, props: IFormComponentHandlerProvidedProps):
      IFormComponentHandlerProps => ({
        id: props.id,
        textResources: state.appData.textResources.resources,
        designMode: state.appData.appConfig.designMode,
        component: state.formDesigner.layout.components[props.id],
        handleDataUpdate: props.handleDataUpdate,
      });

  return connect(mapStateToProps)(FormComponentWithHandlers);
}
