import React from 'react';
import { shallowEqual } from 'react-redux';
import { Grid, makeStyles } from '@material-ui/core';
import classNames from 'classnames';

import type { IComponentProps } from '.';
import type { ILanguage } from 'altinn-shared/types';
import type { ILabelSettings, IComponentValidations } from 'src/types';
import type {
  IDataModelBindings,
  IGrid,
  IGridStyling,
  ITextResourceBindings,
} from '../features/form/layout';

import components from '.';
import { getTextResourceByKey } from 'altinn-shared/utils';
import { Triggers } from 'src/types';
import FormDataActions from '../features/form/data/formDataActions';
import { setCurrentSingleFieldValidation } from '../features/form/validation/validationSlice';
import { makeGetFocus, makeGetHidden } from '../selectors/getLayoutData';
import Label from '../features/form/components/Label';
import Legend from '../features/form/components/Legend';
import { renderValidationMessagesForComponent } from '../utils/render';
import {
  getFormDataForComponent,
  componentValidationsHandledByGenericComponent,
  componentHasValidationMessages,
  getTextResource,
  isComponentValid,
  selectComponentTexts,
} from '../utils/formComponentUtils';
import { FormLayoutActions } from '../features/form/layout/formLayoutSlice';
import Description from '../features/form/components/Description';
import { useAppDispatch, useAppSelector } from 'src/common/hooks';

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
    '& > div:nth-child(2)':{
      paddingLeft: theme.spacing(3/2) // Half the spacing of <Grid in <Form
    }
  },
  sm: {
    [theme.breakpoints.up('sm')]: {
      'border-bottom': '1px dashed #949494',
      '& > div:nth-child(2)':{
        paddingLeft: theme.spacing(3/2)
      }
    },
  },
  md: {
    [theme.breakpoints.up('md')]: {
      'border-bottom': '1px dashed #949494',
      '& > div:nth-child(2)':{
        paddingLeft: theme.spacing(3/2)
      }
    },
  },
  lg: {
    [theme.breakpoints.up('lg')]: {
      'border-bottom': '1px dashed #949494',
      '& > div:nth-child(2)':{
        paddingLeft: theme.spacing(3/2)
      }
    },
  },
  xl: {
    [theme.breakpoints.up('xl')]: {
      'border-bottom': '1px dashed #949494',
      '& > div:nth-child(2)':{
        paddingLeft: theme.spacing(3/2)
      }
    },
  },
}));

export function GenericComponent(props: IGenericComponentProps) {
  const { id, ...passThroughProps } = props;
  const dispatch = useAppDispatch();
  const classes = useStyles(props);
  const GetHiddenSelector = makeGetHidden();
  const GetFocusSelector = makeGetFocus();
  const [hasValidationMessages, setHasValidationMessages] =
    React.useState(false);

  const formData = useAppSelector(
    (state) =>
      getFormDataForComponent(state.formData.formData, props.dataModelBindings),
    shallowEqual,
  );
  const currentView = useAppSelector(
    (state) => state.formLayout.uiConfig.currentView,
  );
  const isValid = useAppSelector((state) =>
    isComponentValid(
      state.formValidations.validations[currentView]?.[props.id],
    ),
  );
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );

  const texts = useAppSelector(state =>
    selectComponentTexts(
      state.textResources.resources,
      props.textResourceBindings,
    ),
  );

  const hidden = useAppSelector(
    (state) => props.hidden || GetHiddenSelector(state, props),
  );
  const shouldFocus = useAppSelector((state) => GetFocusSelector(state, props));
  const componentValidations = useAppSelector(
    (state) => state.formValidations.validations[currentView]?.[props.id],
    shallowEqual,
  );

  React.useEffect(() => {
    setHasValidationMessages(
      componentHasValidationMessages(componentValidations),
    );
  }, [componentValidations]);

  if (hidden) {
    return null;
  }

  const handleDataUpdate = (value: string, key = 'simpleBinding', skipValidation = false) => {
    if (!props.dataModelBindings || !props.dataModelBindings[key]) {
      return;
    }

    if (props.readOnly) {
      return;
    }

    if (formData[key] && formData[key] === value) {
      // data unchanged, do nothing
      return;
    }

    const dataModelBinding = props.dataModelBindings[key];
    if (props.triggers && props.triggers.includes(Triggers.Validation)) {
      dispatch(
        setCurrentSingleFieldValidation({
          dataModelBinding,
          componentId: props.id,
          layoutId: currentView,
        }),
      );
    }

    dispatch(
      FormDataActions.updateFormData({
        field: dataModelBinding,
        data: value,
        componentId: props.id,
        skipValidation
      }),
    );
  };

  const handleFocusUpdate = (componentId: string, step?: number) => {
    dispatch(
      FormLayoutActions.updateFocus({
        currentComponentId: componentId,
        step: step || 0,
      }),
    );
  };

  const getValidationsForInternalHandling = () => {
    if (
      props.type === 'AddressComponent' ||
      props.type === 'Datepicker' ||
      props.type === 'FileUpload' ||
      props.type === 'FileUploadWithTag'
    ) {
      return componentValidations;
    }
    return null;
  };

  // some components handle their validations internally (i.e merge with internal validation state)
  const internalComponentValidations = getValidationsForInternalHandling();
  if (internalComponentValidations !== null) {
    passThroughProps.componentValidations = internalComponentValidations;
  }

  const RenderComponent = components.find(
    (componentCandidate) => componentCandidate.name === props.type,
  );
  if (!RenderComponent) {
    return (
      <div>
        Unknown component type: {props.type}
        <br />
        Valid component types: {components.map((c) => c.name).join(', ')}
      </div>
    );
  }

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
    // eslint-disable-next-line react/prop-types
    if (!props.textResourceBindings?.description) {
      return null;
    }

    return (
      <Description
        // eslint-disable-next-line react/prop-types
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
        // eslint-disable-next-line react/prop-types
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
      return getTextResourceByKey(
        props.textResourceBindings.title,
        textResources,
      );
    }

    return texts.title;
  };

  const getTextResourceWrapper = (key: string) => {
    return getTextResource(key, textResources);
  };

  const getTextResourceAsString = (key: string) => {
    return getTextResourceByKey(key, textResources);
  };

  const componentProps: IComponentProps = {
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

  const noLabelComponents = [
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
    'InstantiationButton',
    'NavigationBar',
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
      className={classNames(
        'form-group',
        'a-form-group',
        classes.container,
        gridToHiddenProps(props.grid?.labelGrid, classes),
      )}
      alignItems='baseline'
    >
      {!noLabelComponents.includes(props.type) && (
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
      )}
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
        <RenderComponent.Tag {...componentProps} />

        {componentValidationsHandledByGenericComponent(
          props.dataModelBindings,
          props.type,
        ) &&
          hasValidationMessages &&
          renderValidationMessagesForComponent(
            componentValidations?.simpleBinding,
            props.id,
          )}
      </Grid>
    </Grid>
  );
}

interface IRenderLabelProps {
  texts: any;
  language: ILanguage;
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

const gridToHiddenProps = (
  labelGrid: IGridStyling,
  classes: ReturnType<typeof useStyles>,
) => {
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
