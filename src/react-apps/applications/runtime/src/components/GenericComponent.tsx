import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { thirdPartyComponentWithElementHandler } from '../../srcOld/containers/thirdPartyComponentWithDataHandler';
import { formComponentWithHandlers } from '../containers/withFormElementHandlers';
import FormDataActions from '../features/form/data/actions';
import * as RuleActions from '../features/form/rules/actions/rule';
import components from './';

import { IRuntimeState } from '../types';

export interface IProvidedProps {
  id: string;
  type: string;
  textResourceBindings: any;
  dataBinding: string;
}

export interface IGenericComponentProps extends IProvidedProps {
  dataModel: any;
  formData: string;
  isValid: boolean;
  textResources: any;
}

class GenericComponent extends React.Component<any> {

  public handleDataUpdate = (data: any, key: string = 'simpleBinding') => {
    FormDataActions.updateFormData(this.props.dataBinding, data);
    const dataModelElement = this.props.dataModel.find(
      (element) => element.DataBindingName === this.props.dataModelBindings[key],
    );
    console.log(dataModelElement);
    RuleActions.checkIfRuleShouldRun(this.props.id, dataModelElement, data);
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
      />
    );
  }
}
const mapStateToProps = (state: IRuntimeState, props: IProvidedProps): IGenericComponentProps => ({
  dataModel: state.formDataModel.dataModel,
  formData: state.formData.formData[props.dataBinding],
  isValid: true,
  textResources: state.formResources.languageResource.resources,
  ...props,
});

export const GenericComponentWrapper = connect(mapStateToProps)(GenericComponent);
