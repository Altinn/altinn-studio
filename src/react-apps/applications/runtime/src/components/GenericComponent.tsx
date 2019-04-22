import * as React from 'react';
import { connect } from 'react-redux';
import { thirdPartyComponentWithElementHandler } from '../../srcOld/containers/thirdPartyComponentWithDataHandler';
import { formComponentWithHandlers } from '../containers/withFormElementHandlers';
import FormDataActions from '../features/form/data/actions';
import components from './';

import { IRuntimeState } from '../types';

export interface IProvidedProps {
  id: string;
  type: string;
  title: string;
  dataBinding: string;
}

export interface IGenericComponentProps extends IProvidedProps {
  formData: string;
  isValid: boolean;
}

class GenericComponent extends React.Component<any> {

  public handleDataUpdate = (data: any) => {
    FormDataActions.updateFormData(this.props.dataBinding, data);
  }

  public render() {
    const Component = formComponentWithHandlers(components.find((c: any) =>
      c.name === this.props.type,
    ).Tag);
    return (
      <Component
        {...this.props}
        handleDataUpdate={this.handleDataUpdate}
      />
    );
  }
}
const mapStateToProps = (state: IRuntimeState, props: IProvidedProps): IGenericComponentProps => ({
  formData: state.formData.formData[props.dataBinding],
  isValid: true,
  ...props,
});

export const GenericComponentWrapper = connect(mapStateToProps)(GenericComponent);
