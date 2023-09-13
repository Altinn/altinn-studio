import React, { useMemo } from 'react';
import { shallowEqual } from 'react-redux';

import { Grid, makeStyles } from '@material-ui/core';
import classNames from 'classnames';

import { Description } from 'src/components/form/Description';
import { Label } from 'src/components/form/Label';
import { Legend } from 'src/components/form/Legend';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { Triggers } from 'src/layout/common.generated';
import { FormComponentContext, shouldComponentRenderLabel } from 'src/layout/index';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { makeGetFocus } from 'src/selectors/getLayoutData';
import { gridBreakpoints, pageBreakStyles } from 'src/utils/formComponentUtils';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { ISingleFieldValidation } from 'src/features/formData/formDataTypes';
import type { IGridStyling } from 'src/layout/common.generated';
import type { IComponentProps, IFormComponentContext, PropsFromGenericComponent } from 'src/layout/index';
import type { CompInternal, CompTypes, ITextResourceBindings } from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IGenericComponentProps<Type extends CompTypes> {
  node: LayoutNode<Type>;
  overrideItemProps?: Partial<Omit<CompInternal<Type>, 'id'>>;
  overrideDisplay?: {
    directRender?: true;
    renderLabel?: false;
    renderLegend?: false;
    renderedInTable?: true;
  };
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

export function GenericComponent<Type extends CompTypes = CompTypes>({
  node,
  overrideItemProps,
  overrideDisplay,
}: IGenericComponentProps<Type>) {
  let item = node.item;
  const id = item.id;
  const textBindings = ('textResourceBindings' in node.item ? node.item.textResourceBindings : undefined) as
    | ITextResourceBindings
    | undefined;
  const dataModelBindings = 'dataModelBindings' in node.item ? node.item.dataModelBindings : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const descriptionTrb = textBindings && 'description' in textBindings ? textBindings.description : undefined;
  const helpTrb = textBindings && 'help' in textBindings ? textBindings.help : undefined;

  if (overrideItemProps) {
    item = {
      ...item,
      ...overrideItemProps,
    };
  }

  const dispatch = useAppDispatch();
  const classes = useStyles();
  const gridRef = React.useRef<HTMLDivElement>(null);
  const GetFocusSelector = makeGetFocus();
  const hasValidationMessages = node.hasValidationMessages('any');
  const hidden = node.isHidden();
  const { lang, langAsString } = useLanguage(node);

  const formData = node.getFormData();
  const currentView = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const isValid = !node.hasValidationMessages('errors');

  const shouldFocus = useAppSelector((state) => GetFocusSelector(state, { id }));
  const componentValidations = useAppSelector(
    (state) => state.formValidations.validations[currentView]?.[id],
    shallowEqual,
  );

  const filterValidationErrors = () => {
    const maxLength = 'maxLength' in node.item && node.item.maxLength;

    if (!maxLength) {
      return componentValidations?.simpleBinding;
    }

    // If maxLength is set in both schema and component, don't display the schema error message
    const errorMessageMaxLength = langAsString('validation_errors.maxLength', [maxLength]) as string;
    const componentErrors = componentValidations?.simpleBinding?.errors || [];
    const updatedErrors = componentErrors.filter((error: string) => error !== errorMessageMaxLength);

    return {
      ...componentValidations.simpleBinding,
      errors: updatedErrors,
    };
  };

  const formComponentContext = useMemo<IFormComponentContext>(
    () => ({
      grid: item.grid,
      id,
      baseComponentId: item.baseComponentId,
      node,
    }),
    [item.baseComponentId, item.grid, id, node],
  );

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

  if (hidden) {
    return null;
  }

  const handleDataChange: IComponentProps['handleDataChange'] = (value, options = {}) => {
    const { key = 'simpleBinding', validate = true } = options;

    if (!dataModelBindings || !dataModelBindings[key]) {
      return;
    }

    if ('readOnly' in item && item.readOnly) {
      return;
    }

    if (formData[key] && formData[key] === value) {
      // data unchanged, do nothing
      return;
    }

    const dataModelBinding = dataModelBindings[key];
    const triggers = 'triggers' in item ? item.triggers : undefined;
    const singleFieldValidation: ISingleFieldValidation | undefined =
      triggers && triggers.includes(Triggers.Validation)
        ? {
            layoutId: currentView,
            dataModelBinding,
          }
        : undefined;

    dispatch(
      FormDataActions.update({
        field: dataModelBinding,
        data: value,
        componentId: id,
        skipValidation: !validate,
        singleFieldValidation,
      }),
    );
  };

  const layoutComponent = node.def as unknown as LayoutComponent<Type>;
  const RenderComponent = layoutComponent.render;

  const RenderLabel = () => {
    if (overrideDisplay?.renderLabel === false) {
      return null;
    }

    return (
      <Label
        key={`label-${id}`}
        labelText={lang(titleTrb)}
        helpText={lang(helpTrb)}
        id={id}
        readOnly={'readOnly' in item ? item.readOnly : false}
        required={'required' in item ? item.required : false}
        labelSettings={'labelSettings' in item ? item.labelSettings : undefined}
      />
    );
  };

  const RenderDescription = () => {
    if (!descriptionTrb) {
      return null;
    }

    return (
      <Description
        key={`description-${id}`}
        description={lang(descriptionTrb)}
        id={id}
      />
    );
  };

  const RenderLegend = () => {
    if (overrideDisplay?.renderLegend === false) {
      return null;
    }

    return (
      <Legend
        key={`legend-${id}`}
        labelText={lang(titleTrb)}
        descriptionText={lang(descriptionTrb)}
        helpText={lang(helpTrb)}
        id={id}
        required={'required' in item ? item.required : false}
        labelSettings={'labelSettings' in item ? item.labelSettings : undefined}
        layout={('layout' in item && item.layout) || undefined}
      />
    );
  };

  const fixedComponentProps: IComponentProps = {
    handleDataChange,
    formData,
    isValid,
    shouldFocus,
    label: RenderLabel,
    legend: RenderLegend,
    componentValidations,
  };

  const componentProps: PropsFromGenericComponent<Type> = {
    ...fixedComponentProps,
    node: node as unknown as LayoutNode<Type>,
    overrideItemProps,
    overrideDisplay,
  };

  const showValidationMessages = hasValidationMessages && layoutComponent.renderDefaultValidations();

  if ('renderAsSummary' in node.item && node.item.renderAsSummary) {
    const RenderSummary = 'renderSummary' in node.def ? node.def.renderSummary.bind(node.def) : null;

    if (!RenderSummary) {
      return null;
    }

    return (
      <SummaryComponent
        summaryNode={node as LayoutNode<'Summary'>}
        overrides={{ display: { hideChangeButton: true } }}
      />
    );
  }

  if (layoutComponent.directRender(componentProps) || overrideDisplay?.directRender) {
    return (
      <FormComponentContext.Provider value={formComponentContext}>
        <RenderComponent {...componentProps} />
      </FormComponentContext.Provider>
    );
  }

  return (
    <FormComponentContext.Provider value={formComponentContext}>
      <Grid
        data-componentbaseid={item.baseComponentId || item.id}
        data-componentid={item.id}
        data-componenttype={item.type}
        ref={gridRef}
        item={true}
        container={true}
        {...gridBreakpoints(item.grid)}
        key={`grid-${id}`}
        className={classNames(
          classes.container,
          gridToClasses(item.grid?.labelGrid, classes),
          pageBreakStyles(item.pageBreak),
        )}
        alignItems='baseline'
      >
        {shouldComponentRenderLabel(node.item.type) && overrideDisplay?.renderLabel !== false && (
          <Grid
            item={true}
            {...gridBreakpoints(item.grid?.labelGrid)}
          >
            <RenderLabel />
            <RenderDescription />
          </Grid>
        )}
        <Grid
          key={`form-content-${id}`}
          item={true}
          id={`form-content-${id}`}
          {...gridBreakpoints(item.grid?.innerGrid)}
        >
          <RenderComponent {...componentProps} />
          {showValidationMessages && renderValidationMessagesForComponent(filterValidationErrors(), id)}
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
    [classes.xs]: labelGrid.xs !== undefined && labelGrid.xs !== 'auto' && labelGrid.xs > 0 && labelGrid.xs < 12,
    [classes.sm]: labelGrid.sm !== undefined && labelGrid.sm !== 'auto' && labelGrid.sm > 0 && labelGrid.sm < 12,
    [classes.md]: labelGrid.md !== undefined && labelGrid.md !== 'auto' && labelGrid.md > 0 && labelGrid.md < 12,
    [classes.lg]: labelGrid.lg !== undefined && labelGrid.lg !== 'auto' && labelGrid.lg > 0 && labelGrid.lg < 12,
    [classes.xl]: labelGrid.xl !== undefined && labelGrid.xl !== 'auto' && labelGrid.xl > 0 && labelGrid.xl < 12,
  };
};
