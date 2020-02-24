import * as React from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { ILanguageState } from '../shared/resources/language/languageReducers';
import components from '.';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { formComponentWithHandlers } from '../features/form/containers/withFormElementHandlers';
import FormDataActions from '../features/form/data/formDataActions';
import { IFormData } from '../features/form/data/formDataReducer';
import { IDataModelBindings, ITextResourceBindings } from '../features/form/layout';
import FormLayoutActions from '../features/form/layout/formLayoutActions';
import RuleActions from '../features/form/rules/rulesActions';
import { makeGetFocus, makeGetHidden } from '../selectors/getLayoutData';
import { IRuntimeState } from '../types';
import { IDataModelFieldElement, ITextResource } from '../types/global';
import { IComponentValidations } from '../types/global';

export interface IGenericComponentProps {
  id: string;
  type: string;
  textResourceBindings: ITextResourceBindings;
  dataModelBindings: IDataModelBindings;
}

export const getFormDataForComponent = (formData: any, dataModelBindings: IDataModelBindings) => {
  if (dataModelBindings.simpleBinding) {
    const formDataVal = formData[dataModelBindings.simpleBinding];
    return formDataVal ? formDataVal : '';
  }

  const formDataObj = {};
  Object.keys(dataModelBindings).forEach((key: any) => {
    const binding = dataModelBindings[key];
    if (formData[binding]) {
      formDataObj[key] = formData[binding];
    }
  });
  return formDataObj;
}

export const GenericComponent = (props: IGenericComponentProps) => {
  const GetHiddenSelector = makeGetHidden();
  const GetFocusSelector = makeGetFocus();

  const dataModel: IDataModelFieldElement[] = useSelector((state: IRuntimeState) => state.formDataModel.dataModel);
  const formData: IFormData = useSelector((state: IRuntimeState) => getFormDataForComponent(state.formData.formData, props.dataModelBindings), shallowEqual);

  const isValid: boolean = useSelector((state: IRuntimeState) =>
    isComponentValid(state.formValidations.validations[props.id]));
  const language: ILanguageState = useSelector((state: IRuntimeState) => state.language.language);
  const textResources: ITextResource[] = useSelector((state: IRuntimeState) => state.textResources.resources);
  const hidden: boolean = useSelector((state: IRuntimeState) => GetHiddenSelector(state, props));
  const shouldFocus: boolean = useSelector((state: IRuntimeState) => GetFocusSelector(state, props));

  const handleDataUpdate = (value: any, key: string = 'simpleBinding') => {
    if (!props.dataModelBindings || !props.dataModelBindings[key]) {
      return;
    }

    const dataModelField = props.dataModelBindings[key];
    FormDataActions.updateFormData(dataModelField, value, props.id);
    // Disable single field validation, enable when supported server-side
    // const component = layoutElement as ILayoutComponent;
    // if (component && component.triggerValidation) {
    //   const { org, app, instanceId } = window as Window as IAltinnWindow;
    //   const url = `${window.location.origin}/${org}/${app}/instances/${instanceId}`;
    //   ValidationActions.runSingleFieldValidation(url, dataModelField);
    // }
    const dataModelElement = dataModel.find(
      (element) => element.dataBindingName === props.dataModelBindings[key],
    );
    RuleActions.checkIfRuleShouldRun(props.id, dataModelElement, value);
  };

  const handleFocusUpdate = (id: string, step?: number) => {
    FormLayoutActions.updateFocus(id, step ? step : 0);
  };

  const getTextResource = (resourceKey: string): string => {
    const textResource = textResources.find((resource: ITextResource) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  };

  if (hidden) {
    return null;
  }

  function selectComponent(component: any): boolean {
    return component.name === props.type;
  }

  const Component = formComponentWithHandlers(components.find(selectComponent).Tag);

  return (
    <Component
      {...props}
      title={getLanguageFromKey(props.textResourceBindings.title, textResources)}
      handleDataChange={handleDataUpdate}
      handleFocusUpdate={handleFocusUpdate}
      getTextResource={getTextResource}
      formData={formData}
      isValid={isValid}
      language={language}
      shouldFocus={shouldFocus}
      key={props.id}
    />
  );

};

export const isComponentValid = (validations: IComponentValidations): boolean => {
  if (!validations) {
    return true;
  }
  let isValid: boolean = true;

  Object.keys(validations).forEach((key: string) => {
    if (validations[key].errors.length > 0) {
      isValid = false;
      return;
    }
  });
  return isValid;
};

export default GenericComponent;
