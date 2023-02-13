import React, { useMemo } from 'react';
import { shallowEqual } from 'react-redux';

import { Grid, makeStyles } from '@material-ui/core';
import classNames from 'classnames';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import Description from 'src/features/form/components/Description';
import Label from 'src/features/form/components/Label';
import Legend from 'src/features/form/components/Legend';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import components, { FormComponentContext } from 'src/layout/index';
import { getLayoutComponentObject } from 'src/layout/LayoutComponent';
import { makeGetFocus, makeGetHidden } from 'src/selectors/getLayoutData';
import { Triggers } from 'src/types';
import {
  componentHasValidationMessages,
  getFormDataForComponent,
  getTextResource,
  gridBreakpoints,
  isComponentValid,
  pageBreakStyles,
  selectComponentTexts,
} from 'src/utils/formComponentUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { getTextResourceByKey } from 'src/utils/sharedUtils';
import type { ExprResolved } from 'src/features/expressions/types';
import type { ISingleFieldValidation } from 'src/features/form/data/formDataTypes';
import type { IComponentProps, IFormComponentContext, PropsFromGenericComponent } from 'src/layout/index';
import type {
  ComponentExceptGroupAndSummary,
  ComponentTypes,
  IGridStyling,
  ILayoutCompBase,
  ILayoutComponent,
} from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { ILabelSettings, LayoutStyle } from 'src/types';

export interface IGenericComponentProps {
  labelSettings?: ILabelSettings;
  layout?: LayoutStyle;
  groupContainerId?: string;
}

/**
 * The IGenericComponentProps type above defines which properties a GenericComponent gets, but it always also gets the
 * component definition from the layout file as well. Blending these two here.
 */
export type IActualGenericComponentProps<Type extends ComponentTypes> = IGenericComponentProps & ILayoutCompBase<Type>;

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

export function GenericComponent<Type extends ComponentExceptGroupAndSummary>(
  passedProps: IActualGenericComponentProps<Type>,
) {
  const evaluatedProps = useResolvedNode(passedProps as ILayoutComponent)?.item;

  const props = {
    ...passedProps,
    ...evaluatedProps,
  } as ExprResolved<IActualGenericComponentProps<Type>> & {
    type: Type;
  };

  const id = props.id;
  const dispatch = useAppDispatch();
  const classes = useStyles(props);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const GetHiddenSelector = makeGetHidden();
  const GetFocusSelector = makeGetFocus();
  const [hasValidationMessages, setHasValidationMessages] = React.useState(false);

  const formData = useAppSelector(
    (state) => getFormDataForComponent(state.formData.formData, props.dataModelBindings),
    shallowEqual,
  );
  const currentView = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const isValid = useAppSelector((state) =>
    isComponentValid(state.formValidations.validations[currentView]?.[props.id]),
  );
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector((state) => state.textResources.resources);

  const texts = useAppSelector((state) =>
    selectComponentTexts(state.textResources.resources, props.textResourceBindings),
  );

  const hidden = useAppSelector((state) => GetHiddenSelector(state, props));
  const shouldFocus = useAppSelector((state) => GetFocusSelector(state, props));
  const componentValidations = useAppSelector(
    (state) => state.formValidations.validations[currentView]?.[props.id],
    shallowEqual,
  );

  const formComponentContext = useMemo<IFormComponentContext>(() => {
    return {
      grid: props.grid,
      id: props.id,
      baseComponentId: props.baseComponentId,
    };
  }, [props.baseComponentId, props.grid, props.id]);

  React.useEffect(() => {
    setHasValidationMessages(componentHasValidationMessages(componentValidations));
  }, [componentValidations]);

  React.useLayoutEffect(() => {
    if (!hidden && shouldFocus && gridRef.current) {
      gridRef.current.scrollIntoView();

      const maybeInput = gridRef.current.querySelector('input,textarea,select') as
        | HTMLSelectElement
        | HTMLInputElement
        | HTMLTextAreaElement;
      if (maybeInput) {
        maybeInput.focus();
      }
      dispatch(FormLayoutActions.updateFocus({ focusComponentId: null }));
    }
  }, [shouldFocus, hidden, dispatch]);

  if (hidden || !language) {
    return null;
  }

  const handleDataChange: IComponentProps['handleDataChange'] = (value, options = {}) => {
    const { key = 'simpleBinding', validate = true } = options;

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
    const singleFieldValidation: ISingleFieldValidation | undefined =
      props.triggers && props.triggers.includes(Triggers.Validation)
        ? {
            layoutId: currentView,
            dataModelBinding,
          }
        : undefined;

    dispatch(
      FormDataActions.update({
        field: dataModelBinding,
        data: value,
        componentId: props.id,
        skipValidation: !validate,
        singleFieldValidation,
      }),
    );
  };

  const layoutComponent = getLayoutComponentObject(props.type) as LayoutComponent<Type> | undefined;
  if (!layoutComponent) {
    return (
      <div>
        Unknown component type: {props.type}
        <br />
        Valid component types: {Object.keys(components).join(', ')}
      </div>
    );
  }

  const RenderComponent = layoutComponent.render;

  const RenderLabel = () => (
    <Label
      key={`label-${props.id}`}
      labelText={texts.title}
      helpText={texts.help}
      language={language}
      id={props.id}
      readOnly={props.readOnly}
      required={props.required}
      labelSettings={props.labelSettings}
    />
  );

  const RenderDescription = () => {
    if (!props.textResourceBindings?.description) {
      return null;
    }

    return (
      <Description
        key={`description-${props.id}`}
        description={texts.description}
        id={id}
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
        id={props.id}
        required={props.required}
        labelSettings={props.labelSettings}
        layout={props.layout}
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
    shouldFocus,
    text: texts.title,
    label: RenderLabel,
    legend: RenderLegend,
    componentValidations,
    ...props,
  } as unknown as PropsFromGenericComponent<Type>;

  const showValidationMessages = hasValidationMessages && layoutComponent.renderDefaultValidations();

  if (layoutComponent.directRender(componentProps)) {
    return (
      <FormComponentContext.Provider value={formComponentContext}>
        <RenderComponent {...componentProps} />
      </FormComponentContext.Provider>
    );
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
          gridToClasses(props.grid?.labelGrid, classes),
          pageBreakStyles(evaluatedProps),
        )}
        alignItems='baseline'
      >
        {layoutComponent.renderWithLabel() && (
          <Grid
            item={true}
            {...gridBreakpoints(props.grid?.labelGrid)}
          >
            <RenderLabel />
            <RenderDescription />
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
            renderValidationMessagesForComponent(componentValidations?.simpleBinding, props.id)}
        </Grid>
      </Grid>
    </FormComponentContext.Provider>
  );
}

const gridToClasses = (labelGrid: IGridStyling | undefined, classes: ReturnType<typeof useStyles>) => {
  if (!labelGrid) {
    return {};
  }

  return {
    [classes.xs]: labelGrid.xs !== undefined && labelGrid.xs > 0 && labelGrid.xs < 12,
    [classes.sm]: labelGrid.sm !== undefined && labelGrid.sm > 0 && labelGrid.sm < 12,
    [classes.md]: labelGrid.md !== undefined && labelGrid.md > 0 && labelGrid.md < 12,
    [classes.lg]: labelGrid.lg !== undefined && labelGrid.lg > 0 && labelGrid.lg < 12,
    [classes.xl]: labelGrid.xl !== undefined && labelGrid.xl > 0 && labelGrid.xl < 12,
  };
};
