import React, { useMemo } from 'react';
import { shallowEqual } from 'react-redux';

import { Grid, makeStyles } from '@material-ui/core';
import classNames from 'classnames';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import components, { FormComponentContext } from 'src/components';
import Description from 'src/features/form/components/Description';
import Label from 'src/features/form/components/Label';
import Legend from 'src/features/form/components/Legend';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { makeGetFocus, makeGetHidden } from 'src/selectors/getLayoutData';
import { LayoutStyle, Triggers } from 'src/types';
import {
  componentHasValidationMessages,
  componentValidationsHandledByGenericComponent,
  getFormDataForComponent,
  getTextResource,
  isComponentValid,
  selectComponentTexts,
} from 'src/utils/formComponentUtils';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { IComponentProps, IFormComponentContext } from 'src/components';
import type {
  ComponentExceptGroup,
  ComponentTypes,
  IGridStyling,
  ILayoutCompBase,
  ILayoutComponent,
} from 'src/features/form/layout';
import type { IComponentValidations, ILabelSettings } from 'src/types';

import { getTextResourceByKey } from 'altinn-shared/utils';
import type { ILanguage } from 'altinn-shared/types';

export interface IGenericComponentProps extends Omit<ILayoutCompBase, 'type'> {
  componentValidations?: IComponentValidations;
  labelSettings?: ILabelSettings;
  hidden?: boolean;
  layout?: LayoutStyle;
  groupContainerId?: string;
}

export interface IActualGenericComponentProps<Type extends ComponentTypes>
  extends IGenericComponentProps {
  type: Type;
}

const useStyles = makeStyles((theme) => ({
  container: {
    '@media print': {
      display: 'flex !important',
    },
  },
  xs: {
    'border-bottom': '1px dashed #949494',
    '& > div:nth-child(2)': {
      paddingLeft: theme.spacing(3 / 2), // Half the spacing of <Grid in <Form
    },
  },
  sm: {
    [theme.breakpoints.up('sm')]: {
      'border-bottom': '1px dashed #949494',
      '& > div:nth-child(2)': {
        paddingLeft: theme.spacing(3 / 2),
      },
    },
  },
  md: {
    [theme.breakpoints.up('md')]: {
      'border-bottom': '1px dashed #949494',
      '& > div:nth-child(2)': {
        paddingLeft: theme.spacing(3 / 2),
      },
    },
  },
  lg: {
    [theme.breakpoints.up('lg')]: {
      'border-bottom': '1px dashed #949494',
      '& > div:nth-child(2)': {
        paddingLeft: theme.spacing(3 / 2),
      },
    },
  },
  xl: {
    [theme.breakpoints.up('xl')]: {
      'border-bottom': '1px dashed #949494',
      '& > div:nth-child(2)': {
        paddingLeft: theme.spacing(3 / 2),
      },
    },
  },
}));

export function GenericComponent<Type extends ComponentExceptGroup>(
  props: IActualGenericComponentProps<Type>,
) {
  const { id, ...passThroughProps } = props;
  const dispatch = useAppDispatch();
  const classes = useStyles(props);
  const gridRef = React.useRef<HTMLDivElement>();
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

  const texts = useAppSelector((state) =>
    selectComponentTexts(
      state.textResources.resources,
      props.textResourceBindings,
      props.type === 'Likert',
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

  const formComponentContext = useMemo<IFormComponentContext>(() => {
    return {
      grid: props.grid,
      baseComponentId: props.baseComponentId,
    };
  }, [props.baseComponentId, props.grid]);

  React.useEffect(() => {
    setHasValidationMessages(
      componentHasValidationMessages(componentValidations),
    );
  }, [componentValidations]);

  React.useLayoutEffect(() => {
    if (!hidden && shouldFocus && gridRef.current) {
      gridRef.current.scrollIntoView();

      const maybeInput = gridRef.current.querySelector(
        'input,textarea,select',
      ) as HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement;
      if (maybeInput) {
        maybeInput.focus();
      }
      dispatch(FormLayoutActions.updateFocus({ focusComponentId: null }));
    }
  }, [shouldFocus, hidden, dispatch]);

  if (hidden) {
    return null;
  }

  const handleDataChange: IComponentProps['handleDataChange'] = (
    value,
    key = 'simpleBinding',
    skipValidation = false,
    checkIfRequired = true,
  ) => {
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
        ValidationActions.setCurrentSingleFieldValidation({
          dataModelBinding,
          componentId: props.id,
          layoutId: currentView,
        }),
      );
    }

    dispatch(
      FormDataActions.update({
        field: dataModelBinding,
        data: value,
        componentId: props.id,
        skipValidation,
        checkIfRequired,
      }),
    );
  };

  const getValidationsForInternalHandling = () => {
    if (
      props.type === 'AddressComponent' ||
      props.type === 'DatePicker' ||
      props.type === 'FileUpload' ||
      props.type === 'FileUploadWithTag' ||
      (props.type === 'Likert' && props.layout === LayoutStyle.Table)
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

  const RenderComponent = components[props.type as keyof typeof components];
  if (!RenderComponent) {
    return (
      <div>
        Unknown component type: {props.type}
        <br />
        Valid component types: {Object.keys(components).join(', ')}
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
    if (!props.textResourceBindings?.description) {
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

  const getTextResourceWrapper = (key: string) => {
    return getTextResource(key, textResources);
  };

  const getTextResourceAsString = (key: string) => {
    return getTextResourceByKey(key, textResources);
  };

  const componentProps = {
    handleDataChange,
    getTextResource: getTextResourceWrapper,
    getTextResourceAsString,
    formData,
    isValid,
    language,
    id,
    shouldFocus,
    text: texts.title,
    label: RenderLabel,
    legend: RenderLegend,
    ...passThroughProps,
  } as IComponentProps & ILayoutComponent<Type>;

  const noLabelComponents: ComponentTypes[] = [
    'Header',
    'Paragraph',
    'Image',
    'NavigationButtons',
    'Custom',
    'AddressComponent',
    'Button',
    'Checkboxes',
    'RadioButtons',
    'AttachmentList',
    'InstantiationButton',
    'NavigationBar',
    'Likert',
    'Panel',
  ];

  const showValidationMessages =
    componentValidationsHandledByGenericComponent(
      props.dataModelBindings,
      props.type,
    ) && hasValidationMessages;

  if (props.type === 'Likert' && props.layout === LayoutStyle.Table) {
    return <RenderComponent {...componentProps} />;
  }

  return (
    <FormComponentContext.Provider value={formComponentContext}>
      <Grid
        ref={gridRef}
        item={true}
        container={true}
        {...gridBreakpoints(props.grid)}
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
            {...gridBreakpoints(props.grid?.labelGrid)}
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
          {...gridBreakpoints(props.grid?.innerGrid)}
        >
          <RenderComponent {...componentProps} />
          {showValidationMessages &&
            renderValidationMessagesForComponent(
              componentValidations?.simpleBinding,
              props.id,
            )}
        </Grid>
      </Grid>
    </FormComponentContext.Provider>
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

const gridBreakpoints = (grid?: IGridStyling) => {
  const { xs, sm, md, lg, xl } = grid || {};
  return {
    xs: xs || 12,
    ...(sm && { sm }),
    ...(md && { md }),
    ...(lg && { lg }),
    ...(xl && { xl }),
  };
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
