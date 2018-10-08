import * as React from 'react';
import { connect } from 'react-redux';

export interface IFormComponentHandlerProvidedProps {
  id: string;
}

export interface IFormComponentHandlerProps {
  id: string;
  textResources: any[];
  validationErrors: any;
}

export const formComponentWithHandlers = (WrappedComponent: React.ComponentType<any>): React.ComponentType<IFormComponentHandlerProvidedProps> => {


  class FormComponentWithHandlers extends React.Component<IFormComponentHandlerProps> {
    public handleDataUpdate = (id: string, data: any) => console.log(`ComponentId-${id} Updated with data=${data}`);

    public getTextResource = (resourceKey: string): any[] => {
      return this.props.textResources.find(resource => resource.id === resourceKey);
    }

    public render(): JSX.Element {
      const { id, ...passThroughProps } = this.props;
      const isValid = !this.props.validationErrors[this.props.id] ? true : false;
      return (
        <WrappedComponent
          handleDataChange={this.handleDataUpdate.bind(null, id)}
          label={'hello'}
          isValid={isValid}
          {...passThroughProps}
        />
      )
    }
  }

  const mapStateToProps: (state: IAppState, props: IFormComponentHandlerProvidedProps) => IFormComponentHandlerProps = (state: IAppState, props: IFormComponentHandlerProvidedProps) => ({
    id: props.id,
    component: state.formDesigner.layout.components,
    textResources: state.appData.textResources.resources,
    validationErrors: state.formFiller.validationErrors
  });

  return connect(mapStateToProps)(FormComponentWithHandlers)
}
