import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { thirdPartyComponentWithElementHandler } from '../../srcOld/containers/thirdPartyComponentWithDataHandler';
import { formComponentWithHandlers } from '../containers/withFormElementHandlers';
import FormDataActions from '../features/form/data/actions';
import RuleActions from '../features/form/rules/actions';
import components from './';

import { IRuntimeState } from '../types';

export interface IProvidedProps {
  id: string;
  type: string;
  textResourceBindings: any;
  dataModelBindings: string;
}

export interface IGenericComponentProps extends IProvidedProps {
  dataModel: any;
  formData: string;
  isValid: boolean;
  textResources: any;
}

class GenericComponent extends React.Component<any> {
  public handleDataUpdate = (value: any, key?: string) => {
    key = key ? key : 'simpleBinding';
    if (!this.props.dataModelBindings || !this.props.dataModelBindings[key]) {
      return;
    }
    FormDataActions.updateFormData(this.props.dataModelBindings[key], value);
    const dataModelElement = this.props.dataModel.find(
      (element) => element.DataBindingName === this.props.dataModelBindings[key],
    );
    RuleActions.checkIfRuleShouldRun(this.props.id, dataModelElement, value);
  }
  public getTextResource = (resourceKey: string): string => {
    const textResource = this.props.textResources.find((resource) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  }

  public render() {
    const Component = formComponentWithHandlers(components.find((c: any) =>
      c.name === this.props.component,
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
  dataModel: state.formDataModel.dataModel,
  formData: state.formData.formData[props.dataModelBindings],
  isValid: true,
  textResources: state.formResources.languageResource.resources,
  ...props,
});

export const GenericComponentWrapper = connect(mapStateToProps)(GenericComponent);
