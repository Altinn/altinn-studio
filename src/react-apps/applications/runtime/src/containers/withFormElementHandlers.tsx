import * as React from 'react';
import { connect } from 'react-redux';

import { IRuntimeState } from '../types';

export interface IProvidedProps {
  id: string;
  handleDataUpdate: (data: any) => void;
  dataBinding: string;
  title: string;
}

export interface IProps extends IProvidedProps {
  textResources: any[];
}

export const formComponentWithHandlers = (WrappedComponent: React.ComponentType<any>): React.ComponentClass<any> => {
  class FormComponentWithHandlers extends React.Component<IProps> {

    public handleDataUpdate = (data: any) => this.props.handleDataUpdate(data);

    public getTextResource = (resourceKey: string): string => {
      if (this.props.textResources.find((resource) => resource.id === resourceKey)) {
        return this.props.textResources.find((resource) => resource.id === resourceKey).value;
      }
      return resourceKey;
    }

    public render(): JSX.Element {
      const { id, ...passThroughProps } = this.props;

      const text = this.getTextResource(this.props.title);
      return (
        <>
          {text}
          <WrappedComponent
            id={id}
            handleDataChange={this.handleDataUpdate}
            {...passThroughProps}
          />
        </>
      );
    }
  }

  const mapStateToProps = (state: IRuntimeState, props: IProvidedProps): IProps => ({
    textResources: state.formResources.languageResource.resources,
    ...props,
  });

  return connect(mapStateToProps)(FormComponentWithHandlers);
};
