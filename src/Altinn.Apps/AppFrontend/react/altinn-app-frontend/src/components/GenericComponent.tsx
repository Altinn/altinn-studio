/* eslint-disable react/prop-types */
/* eslint-disable max-len */
import * as React from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { getTextResourceByKey } from 'altinn-shared/utils';
import { IDataModelFieldElement, ITextResource, Triggers } from 'src/types';
import { IComponentValidations } from 'src/types';
import { ILanguageState } from '../shared/resources/language/languageReducers';
// eslint-disable-next-line import/no-cycle
import components from '.';
import FormDataActions from '../features/form/data/formDataActions';
import { IFormData } from '../features/form/data/formDataReducer';
import { IDataModelBindings, ITextResourceBindings } from '../features/form/layout';
import RuleActions from '../features/form/rules/rulesActions';
import ValidationActions from '../features/form/validation/validationActions';
import { makeGetFocus, makeGetHidden } from '../selectors/getLayoutData';
import { IRuntimeState } from '../types';
import Label from '../features/form/components/Label';
import Legend from '../features/form/components/Legend';
import { renderValidationMessagesForComponent } from '../utils/render';
import { getFormDataForComponent,
  isSimpleComponent,
  componentHasValidationMessages,
  getTextResource,
  isComponentValid,
  selectComponentTexts } from '../utils/formComponentUtils';
import FormLayoutActions from '../features/form/layout/formLayoutActions';
import Description from '../features/form/components/Description';

export interface IGenericComponentProps {
  id: string;
  type: string;
  textResourceBindings: ITextResourceBindings;
  dataModelBindings: IDataModelBindings;
  componentValidations?: IComponentValidations;
  readOnly: boolean;
  required: boolean;
  triggers?: Triggers[];
  hidden?: boolean;
}

export function GenericComponent(props: IGenericComponentProps) {
  const {
    id,
    ...passThroughProps
  } = props;

  const GetHiddenSelector = makeGetHidden();
  const GetFocusSelector = makeGetFocus();
  const [isSimple, setIsSimple] = React.useState(true);
  const [hasValidationMessages, setHasValidationMessages] = React.useState(false);

  const dataModel: IDataModelFieldElement[] = useSelector((state: IRuntimeState) => state.formDataModel.dataModel);
  const formData: IFormData = useSelector((state: IRuntimeState) => getFormDataForComponent(state.formData.formData, props.dataModelBindings), shallowEqual);
  const currentView: string = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const isValid: boolean = useSelector((state: IRuntimeState) => isComponentValid(state.formValidations.validations[currentView]?.[props.id]));
  const language: ILanguageState = useSelector((state: IRuntimeState) => state.language.language);
  const textResources: ITextResource[] = useSelector((state: IRuntimeState) => state.textResources.resources);
  const texts: any = useSelector((state: IRuntimeState) => selectComponentTexts(state.textResources.resources, props.textResourceBindings));
  const hidden: boolean = useSelector((state: IRuntimeState) => props.hidden || GetHiddenSelector(state, props));
  const shouldFocus: boolean = useSelector((state: IRuntimeState) => GetFocusSelector(state, props));
  const componentValidations: IComponentValidations = useSelector((state: IRuntimeState) => state.formValidations.validations[currentView]?.[props.id], shallowEqual);

  React.useEffect(() => {
    if (props.dataModelBindings && props.type) {
      setIsSimple(isSimpleComponent(props.dataModelBindings, props.type));
    }
  }, []);

  React.useEffect(() => {
    setHasValidationMessages(componentHasValidationMessages(componentValidations));
  }, [componentValidations]);

  const handleDataUpdate = (value: any, key: string = 'simpleBinding') => {
    if (!props.dataModelBindings || !props.dataModelBindings[key]) {
      return;
    }

    if (props.readOnly) {
      return;
    }

    const dataModelField = props.dataModelBindings[key];
    if (props.triggers && props.triggers.includes(Triggers.Validation)) {
      ValidationActions.setCurrentSingleFieldValidation(dataModelField);
    }

    FormDataActions.updateFormData(dataModelField, value, props.id);

    const dataModelElement = dataModel.find(
      (element) => element.dataBindingName === props.dataModelBindings[key],
    );
    RuleActions.checkIfRuleShouldRun(props.id, dataModelElement, value);
  };

  const handleFocusUpdate = (componentId: string, step?: number) => {
    FormLayoutActions.updateFocus(componentId, step || 0);
  };

  const getValidationsForInternalHandling = () => {
    if (props.type === 'AddressComponent' || props.type === 'Datepicker' || props.type === 'FileUpload') {
      return componentValidations;
    }
    return null;
  };

  // some compoenets handle their validations internally (i.e merge with internal validaiton state)
  const internalComponentValidations = getValidationsForInternalHandling();
  if (internalComponentValidations !== null) {
    passThroughProps.componentValidations = internalComponentValidations;
  }

  if (hidden) {
    return null;
  }

  const RenderComponent = components.find((componentCandidate) => componentCandidate.name === props.type).Tag;

  const RenderLabel = () => {
    return (
      <Label
        labelText={texts.title}
        helpText={texts.help}
        language={language}
        {...props}
        {...passThroughProps}
      />
    );
  };

  const RenderDescription = () => {
    if (!props.textResourceBindings.description) {
      return null;
    }
    return (
      <Description
        description={texts.description}
        id={id}
        {...passThroughProps}
      />
    );
  };

  const RenderLegend = () => {
    return (
      <Legend
        labelText={texts.title}
        descriptionText={texts.description}
        helpText={texts.help}
        language={language}
        {...props}
        {...passThroughProps}
      />
    );
  };

  const getText = () => {
    if (props.type === 'Header') {
      // disabled markdown parsing
      return getTextResourceByKey(props.textResourceBindings.title, textResources);
    }

    return texts.title;
  };

  const getTextResourceWrapper = (key: string) => {
    return getTextResource(key, textResources);
  };

  const getTextResourceAsString = (key: string) => {
    return getTextResourceByKey(key, textResources);
  };

  const componentProps = {
    handleDataChange: handleDataUpdate,
    handleFocusUpdate,
    getTextResource: getTextResourceWrapper,
    getTextResourceAsString,
    formData,
    isValid,
    language,
    id,
    shouldFocus,
    text: getText(),
    label: RenderLabel,
    legend: RenderLegend,
    ...passThroughProps,
  };

  const noLabelComponents: string[] = [
    'Header',
    'Paragraph',
    'Submit',
    'ThirdParty',
    'AddressComponent',
    'Button',
    'Checkboxes',
    'RadioButtons',
  ];

  return (
    <>
      {noLabelComponents.includes(props.type) ?
        null
        :
        <RenderLabel />
      }

      {noLabelComponents.includes(props.type) ?
        null
        :
        <RenderDescription/>
      }

      <RenderComponent
        {...componentProps}
      />

      {isSimple && hasValidationMessages &&
            renderValidationMessagesForComponent(componentValidations?.simpleBinding, props.id)
      }
    </>
  );
}

export default GenericComponent;
