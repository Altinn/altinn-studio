import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { thirdPartyComponentWithElementHandler } from '../../srcOld/containers/thirdPartyComponentWithDataHandler';
import { formComponentWithHandlers } from '../containers/withFormElementHandlers';
import FormDataActions from '../features/form/data/actions';
import RuleActions from '../features/form/rules/actions';
import components from './';

import { IRuntimeState } from '../types';
import { makeGetFormDataSelector } from '../selectors/getFormData';

export interface IProvidedProps {
  id: string;
  type: string;
  textResourceBindings: any;
  dataModelBindings: any;
  formData: any;
  component: string;
}

export interface IGenericComponentProps extends IProvidedProps {
  dataModel: any;
  isValid: boolean;
  textResources: any;
}
export interface IState {
  changed: boolean;
}

class GenericComponent extends React.Component<IGenericComponentProps, IState> {
  constructor(_props: IGenericComponentProps) {
    super(_props);

    this.state = {
      changed: _props.formData.changed,
    };
  }
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
  public getFormData = (): string | {} => {
    if (!this.props.dataModelBindings ||
      Object.keys(this.props.dataModelBindings).length === 0) {
      return '';
    }
    const valueArr: { [id: string]: string } = {};
    for (const dataBindingKey in this.props.dataModelBindings) {
      if (!dataBindingKey) {
        continue;
      }
      valueArr[dataBindingKey] = this.props.formData.formData[this.props.dataModelBindings[dataBindingKey]];
    }
    if (Object.keys(valueArr).indexOf('simpleBinding') >= 0) {
      // Simple component
      return valueArr.simpleBinding;
    } else {
      // Advanced component
      return valueArr;
    }
  }
  public render() {
    const Component = formComponentWithHandlers(components.find((c: any) =>
      c.name === this.props.component,
    ).Tag);
    console.log(this.props.formData);
    return (
      <Component
        {...this.props}
        title={getLanguageFromKey(this.props.textResourceBindings.title, this.props.textResources)}
        handleDataChange={this.handleDataUpdate}
        getTextResource={this.getTextResource}
        formData={this.getFormData()}
      />
    );
  }
}
const makeMapStateToProps = () => {
  const GetFormDataSelector = makeGetFormDataSelector();
  const mapStateToProps = (state: IRuntimeState, props: IProvidedProps): IGenericComponentProps => {
    return {
      dataModel: state.formDataModel.dataModel,
      isValid: true,
      textResources: state.formResources.languageResource.resources,
      formData: GetFormDataSelector(state, props),
      ...props,
    };
  };
  return mapStateToProps;
};

export const GenericComponentWrapper = connect(makeMapStateToProps)(GenericComponent);
