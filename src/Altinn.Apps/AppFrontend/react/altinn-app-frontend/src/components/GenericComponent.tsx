/* eslint-disable react/prop-types */
/* eslint-disable max-len */
import * as React from 'react';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { getTextResourceByKey } from 'altinn-shared/utils';
import { ILabelSettings, ITextResource, Triggers } from 'src/types';
import { IComponentValidations } from 'src/types';
import { Grid, makeStyles } from '@material-ui/core';
import classNames from 'classnames';
import { ILanguageState } from '../shared/resources/language/languageReducers';
// eslint-disable-next-line import/no-cycle
import components from '.';
import FormDataActions from '../features/form/data/formDataActions';
import { IFormData } from '../features/form/data/formDataReducer';
import { IDataModelBindings, IGrid, IGridStyling, ITextResourceBindings } from '../features/form/layout';
import RuleActions from '../features/form/rules/rulesActions';
import { setCurrentSingleFieldValidation } from '../features/form/validation/validationSlice';
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
import { FormLayoutActions } from '../features/form/layout/formLayoutSlice';
import Description from '../features/form/components/Description';

export interface IGenericComponentProps {
  id: string;
  type: string;
  textResourceBindings: ITextResourceBindings;
  dataModelBindings: IDataModelBindings;
  componentValidations?: IComponentValidations;
  readOnly?: boolean;
  required?: boolean;
  labelSettings?: ILabelSettings;
  grid?: IGrid;
  triggers?: Triggers[];
  hidden?: boolean;
}

const useStyles = makeStyles((theme) => ({
  container: {
    '@media print': {
      display: 'flex !important',
    },
  },
  xs: {
    'border-bottom': '1px dashed #949494',
  },
  sm: {
    [theme.breakpoints.up('sm')]: {
      'border-bottom': '1px dashed #949494',
    },
  },
  md: {
    [theme.breakpoints.up('md')]: {
      'border-bottom': '1px dashed #949494',
    },
  },
  lg: {
    [theme.breakpoints.up('lg')]: {
      'border-bottom': '1px dashed #949494',
    },
  },
  xl: {
    [theme.breakpoints.up('xl')]: {
      'border-bottom': '1px dashed #949494',
    },
  },
}));

export function GenericComponent(props: IGenericComponentProps) {
  const {
    id,
    ...passThroughProps
  } = props;
  const dispatch = useDispatch();
  const classes = useStyles(props);
  const GetHiddenSelector = makeGetHidden();
  const GetFocusSelector = makeGetFocus();
  const [isSimple, setIsSimple] = React.useState(true);
  const [hasValidationMessages, setHasValidationMessages] = React.useState(false);

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
    setIsSimple(isSimpleComponent(props.dataModelBindings, props.type));
  }, []);

  React.useEffect(() => {
    setHasValidationMessages(componentHasValidationMessages(componentValidations));
  }, [componentValidations]);

  if (hidden) {
    return null;
  }

  const handleDataUpdate = (value: any, key: string = 'simpleBinding') => {
    if (!props.dataModelBindings || !props.dataModelBindings[key]) {
      return;
    }

    if (props.readOnly) {
      return;
    }

    if (formData instanceof Object) {
      if (formData[key] && formData[key] === value) {
        // data unchanged, do nothing
        return;
      }
    } else if (formData && formData === value) {
      // data unchanged, do nothing
      return;
    }

    const dataModelBinding = props.dataModelBindings[key];
    if (props.triggers && props.triggers.includes(Triggers.Validation)) {
      dispatch(setCurrentSingleFieldValidation({
        dataModelBinding,
        componentId: props.id,
        layoutId: currentView,
      }));
    }

    dispatch(FormDataActions.updateFormData({
      field: dataModelBinding,
      data: value,
      componentId: props.id,
    }));

    RuleActions.checkIfRuleShouldRun(props.id, props.dataModelBindings[key], value);
  };

  const handleFocusUpdate = (componentId: string, step?: number) => {
    dispatch(FormLayoutActions.updateFocus({ currentComponentId: componentId, step: step || 0 }));
  };

  const getValidationsForInternalHandling = () => {
    if (props.type === 'AddressComponent' || props.type === 'Datepicker' || props.type === 'FileUpload') {
      return componentValidations;
    }
    return null;
  };

  // some components handle their validations internally (i.e merge with internal validation state)
  const internalComponentValidations = getValidationsForInternalHandling();
  if (internalComponentValidations !== null) {
    passThroughProps.componentValidations = internalComponentValidations;
  }

  const RenderComponent = components.find((componentCandidate) => componentCandidate.name === props.type).Tag;

  const RenderLabel = () => {
    return (
      <RenderLabelScoped
        props={props}
        passThroughProps={passThroughProps}
        language={language}
        texts={texts}
      />
    );
  };

  const RenderDescription = () => {
    if (!props.textResourceBindings.description) {
      return null;
    }
    return (
      <Description
        key={`description-${props.id}`}
        description={texts.description}
        id={id}
        {...passThroughProps}
      />
    );
  };

  const RenderLegend = () => {
    return (
      <Legend
        key={`legend-${props.id}`}
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
    'Image',
    'Submit',
    'ThirdParty',
    'AddressComponent',
    'Button',
    'Checkboxes',
    'RadioButtons',
    'AttachmentList',
  ];

  return (
    <Grid
      item={true}
      container={true}
      xs={props.grid?.xs || 12}
      sm={props.grid?.sm || false}
      md={props.grid?.md || false}
      lg={props.grid?.lg || false}
      xl={props.grid?.xl || false}
      key={`grid-${props.id}`}
      className={
        classNames('form-group', 'a-form-group', classes.container, gridToHiddenProps(props.grid?.labelGrid, classes))
      }
      alignItems='baseline'
    >
      {!noLabelComponents.includes(props.type) &&
        <Grid
          item={true}
          xs={props.grid?.labelGrid?.xs || 12}
          sm={props.grid?.labelGrid?.sm || false}
          md={props.grid?.labelGrid?.md || false}
          lg={props.grid?.labelGrid?.lg || false}
          xl={props.grid?.labelGrid?.xl || false}
        >
          <RenderLabelScoped
            props={props}
            passThroughProps={passThroughProps}
            language={language}
            texts={texts}
          />
          <RenderDescription key={`description-${props.id}`} />
        </Grid>
      }
      <Grid
        key={`form-content-${props.id}`}
        item={true}
        id={`form-content-${props.id}`}
        xs={props.grid?.innerGrid?.xs || 12}
        sm={props.grid?.innerGrid?.sm || false}
        md={props.grid?.innerGrid?.md || false}
        lg={props.grid?.innerGrid?.lg || false}
        xl={props.grid?.innerGrid?.xl || false}
      >
        <RenderComponent
          {...componentProps}
        />

        {isSimple && hasValidationMessages &&
          renderValidationMessagesForComponent(componentValidations?.simpleBinding, props.id)
        }
      </Grid>
    </Grid>
  );
}

interface IRenderLabelProps {
  texts: any;
  language: any;
  props: any;
  passThroughProps: any;
}

const RenderLabelScoped = (props: IRenderLabelProps) => {
  return (
    <Label
      key={`label-${props.props.id}`}
      labelText={props.texts.title}
      helpText={props.texts.help}
      language={props.language}
      {...props.props}
      {...props.passThroughProps}
    />
  );
};

const gridToHiddenProps = (labelGrid: IGridStyling, classes: ReturnType<typeof useStyles>) => {
  if (!labelGrid) return undefined;
  return {
    [classes.xs]: labelGrid.xs > 0 && labelGrid.xs < 12,
    [classes.sm]: labelGrid.sm > 0 && labelGrid.sm < 12,
    [classes.md]: labelGrid.md > 0 && labelGrid.md < 12,
    [classes.lg]: labelGrid.lg > 0 && labelGrid.lg < 12,
    [classes.xl]: labelGrid.xl > 0 && labelGrid.xl < 12,
  };
};

export default GenericComponent;
