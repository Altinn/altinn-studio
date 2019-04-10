import * as React from 'react';
import { connect } from 'react-redux';
import { IRuntimeState } from '../reducers';

export interface IFormComponentHandlerProvidedProps {
  id: string;
  handleDataUpdate: (data: any) => void;
  component: IFormComponent;
}

export interface IFormComponentHandlerProps extends IFormComponentHandlerProvidedProps {
  textResources: ITextResource[];
}

export const formComponentWithHandlers = (WrappedComponent: React.ComponentType<any>): React.ComponentClass<any> => {
  class FormComponentWithHandlers extends React.Component<IFormComponentHandlerProps> {

    public handleDataUpdate = (data: any) => this.props.handleDataUpdate(data);

    public getTextResource = (resourceKey: string): string => {
      if (this.props.textResources.find((resource) => resource.id === resourceKey)) {
        return this.props.textResources.find((resource) => resource.id === resourceKey).value;
      }
      return resourceKey;
    }

    public render(): JSX.Element {
      const { id, ...passThroughProps } = this.props;

      const text = this.getTextResource(this.props.component.textResourceBindings.title);

      return (
        <WrappedComponent
          id={id}
          handleDataChange={this.handleDataUpdate}
          text={text}
          size={this.props.component.size}
          {...passThroughProps}
        />
      );
    }
  }

  const mapStateToProps: (state: IRuntimeState, props: IFormComponentHandlerProvidedProps) =>
    IFormComponentHandlerProps = (state: IRuntimeState, props: IFormComponentHandlerProvidedProps):
      IFormComponentHandlerProps => ({
        id: props.id,
        textResources: state.formDataModel.dataModel,
        component: state.formLayout.components[props.id],
        handleDataUpdate: props.handleDataUpdate,
      });

  return connect(mapStateToProps)(FormComponentWithHandlers);
};
