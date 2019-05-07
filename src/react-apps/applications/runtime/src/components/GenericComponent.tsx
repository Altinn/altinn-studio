import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { thirdPartyComponentWithElementHandler } from '../../srcOld/containers/thirdPartyComponentWithDataHandler';
import { formComponentWithHandlers } from '../containers/withFormElementHandlers';
import FormDataActions from '../features/form/data/actions';
import components from './';

import { IRuntimeState } from '../types';

export interface IProvidedProps {
  id: string;
  type: string;
  textResourceBindings: any;
  dataBindings: string;
}

export interface IGenericComponentProps extends IProvidedProps {
  formData: string;
  isValid: boolean;
  textResources: any;
}

class GenericComponent extends React.Component<any> {

  public handleDataUpdate = (value: any, key?: string) => {
    key = key ? key : 'simpleBinding';
    if (!this.props.dataBindings || !this.props.dataBindings[key]) {
      return;
    }
    FormDataActions.updateFormData(this.props.dataBindings[key], value);
  }
  public getTextResource = (resourceKey: string): string => {
    const textResource = this.props.textResources.find((resource) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  }

  public render() {
    const Component = formComponentWithHandlers(components.find((c: any) =>
      c.name === this.props.type,
    ).Tag);
    return (
      <Component
        {...this.props}
        title={getLanguageFromKey(this.props.textResourceBindings.title, this.props.textResources)}
        handleDataChange={this.handleDataUpdate}
        getTextResource={this.getTextResource}
      />
    );
  }
}
const mapStateToProps = (state: IRuntimeState, props: IProvidedProps): IGenericComponentProps => ({
  formData: state.formData.formData[props.dataBindings],
  isValid: true,
  textResources: state.formResources.languageResource.resources,
  ...props,
});

export const GenericComponentWrapper = connect(mapStateToProps)(GenericComponent);
