import * as React from 'react';
import { useSelector } from 'react-redux';
import { ILanguageState } from 'src/shared/resources/language/languageReducers';
import components from '.';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { formComponentWithHandlers } from '../features/form/containers/withFormElementHandlers';
import FormDataActions from '../features/form/data/actions';
import { IFormData } from '../features/form/data/reducer';
import FormDynamicsActions from '../features/form/dynamics/actions';
import { IDataModelBindings, ILayoutComponent, ILayoutEntry, ITextResourceBindings } from '../features/form/layout';
import FormLayoutActions from '../features/form/layout/actions/index';
import RuleActions from '../features/form/rules/actions';
import ValidationActions from '../features/form/validation/actions';
import { makeGetFormDataSelector } from '../selectors/getFormData';
import { makeGetFocus, makeGetHidden, makeGetLayoutElement } from '../selectors/getLayoutData';
import { IAltinnWindow, IRuntimeState } from '../types';
import { IDataModelFieldElement, ITextResource } from '../types/global';
import { IComponentValidations } from '../types/global';

export interface IGenericComponentProps {
  id: string;
  type: string;
  textResourceBindings: ITextResourceBindings;
  dataModelBindings: IDataModelBindings;
}

export const GenericComponent = (props: IGenericComponentProps) => {

  const GetFormDataSelector = makeGetFormDataSelector();
  const GetLayoutElementSelector = makeGetLayoutElement();
  const GetHiddenSelector = makeGetHidden();
  const GetFocusSelector = makeGetFocus();

  const dataModel: IDataModelFieldElement[] = useSelector((state: IRuntimeState) => state.formDataModel.dataModel);
  const formData: IFormData = useSelector((state: IRuntimeState) => GetFormDataSelector(state, props));
  const isValid: boolean = useSelector((state: IRuntimeState) =>
    isComponentValid(state.formValidations.validations[props.id]));
  const language: ILanguageState = useSelector((state: IRuntimeState) => state.language.language);
  const layoutElement: ILayoutEntry = useSelector((state: IRuntimeState) => GetLayoutElementSelector(state, props));
  const textResources: ITextResource[] = useSelector((state: IRuntimeState) => state.textResources.resources);
  const hidden: boolean = useSelector((state: IRuntimeState) => GetHiddenSelector(state, props));
  const shouldFocus: boolean = useSelector((state: IRuntimeState) => GetFocusSelector(state, props));

  const handleDataUpdate = (value: any, key: string = 'simpleBinding') => {
    if (!props.dataModelBindings || !props.dataModelBindings[key]) {
      return;
    }

    const dataModelField = props.dataModelBindings[key];
    FormDataActions.updateFormData(dataModelField, value, props.id);
    FormDynamicsActions.checkIfConditionalRulesShouldRun();
    const component = layoutElement as ILayoutComponent;
    if (component && component.triggerValidation) {
      const { org, app, instanceId } = window as Window as IAltinnWindow;
      const url = `${window.location.origin}/${org}/${app}/api/${instanceId}`;
      ValidationActions.runSingleFieldValidation(url, dataModelField);
    }
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

  const getFormData = (): string | {} => {
    if (!props.dataModelBindings ||
      Object.keys(props.dataModelBindings).length === 0) {
      return '';
    }

    const valueArr: { [id: string]: string } = {};
    for (const dataBindingKey in props.dataModelBindings) {
      if (!dataBindingKey) {
        continue;
      }
      valueArr[dataBindingKey] = formData[props.dataModelBindings[dataBindingKey]];
    }

    if (Object.keys(valueArr).indexOf('simpleBinding') >= 0) {
      // Simple component
      return valueArr.simpleBinding;
    } else {
      // Advanced component
      return valueArr;
    }

  };

  if (hidden) {
    return null;
  }

  const Component = formComponentWithHandlers(components.find((c: any) =>
    c.name === props.type,
  ).Tag);

  return (
    <Component
      {...props}
      title={getLanguageFromKey(props.textResourceBindings.title, textResources)}
      handleDataChange={handleDataUpdate}
      handleFocusUpdate={handleFocusUpdate}
      getTextResource={getTextResource}
      formData={getFormData()}
      isValid={isValid}
      language={language}
      shouldFocus={shouldFocus}
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
