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
import { getTextResourceByKey } from 'src/language/sharedLanguage';
import { components, FormComponentContext } from 'src/layout/index';
import { makeGetFocus } from 'src/selectors/getLayoutData';
import { Triggers } from 'src/types';
import { getTextResource, gridBreakpoints, pageBreakStyles, selectComponentTexts } from 'src/utils/formComponentUtils';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { ISingleFieldValidation } from 'src/features/formData/formDataTypes';
import type { IComponentProps, IFormComponentContext, PropsFromGenericComponent } from 'src/layout/index';
import type { ComponentTypes, IGridStyling } from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { AnyItem, LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IGenericComponentProps<Type extends ComponentTypes> {
  node: LayoutNode | LayoutNodeFromType<Type>;
  overrideItemProps?: Partial<Omit<AnyItem<Type>, 'id'>>;
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

export function GenericComponent<Type extends ComponentTypes = ComponentTypes>({
  node,
  overrideItemProps,
}: IGenericComponentProps<Type>) {
  let item = node.item;
  const id = item.id;

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

  const formData = node.getFormData();
  const currentView = useAppSelector((state) => state.formLayout.uiConfig.currentView);

  const isValid = !node.hasValidationMessages('errors');
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector((state) => state.textResources.resources);

  const texts = useAppSelector((state) =>
    selectComponentTexts(state.textResources.resources, item.textResourceBindings),
  );

  const shouldFocus = useAppSelector((state) => GetFocusSelector(state, { id }));
  const componentValidations = useAppSelector(
    (state) => state.formValidations.validations[currentView]?.[id],
    shallowEqual,
  );

  const formComponentContext = useMemo<IFormComponentContext>(
    () => ({
      grid: item.grid,
      id,
      baseComponentId: item.baseComponentId,
    }),
    [item.baseComponentId, item.grid, id],
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

  if (hidden || !language) {
    return null;
  }

  const handleDataChange: IComponentProps['handleDataChange'] = (value, options = {}) => {
    const { key = 'simpleBinding', validate = true } = options;

    if (!item.dataModelBindings || !item.dataModelBindings[key]) {
      return;
    }

    if (item.readOnly) {
      return;
    }

    if (formData[key] && formData[key] === value) {
      // data unchanged, do nothing
      return;
    }

    const dataModelBinding = item.dataModelBindings[key];
    const singleFieldValidation: ISingleFieldValidation | undefined =
      item.triggers && item.triggers.includes(Triggers.Validation)
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

  const layoutComponent = node.def as unknown as LayoutComponent<Type> | undefined;
  if (!layoutComponent) {
    return (
      <div>
        Unknown component type: {item.type}
        <br />
        Valid component types: {Object.keys(components).join(', ')}
      </div>
    );
  }

  const RenderComponent = layoutComponent.render;

  const RenderLabel = () => (
    <Label
      key={`label-${id}`}
      labelText={texts.title}
      helpText={texts.help}
      language={language}
      id={id}
      readOnly={item.readOnly}
      required={item.required}
      labelSettings={item.labelSettings}
    />
  );

  const RenderDescription = () => {
    if (!item.textResourceBindings?.description) {
      return null;
    }

    return (
      <Description
        key={`description-${id}`}
        description={texts.description}
        id={id}
      />
    );
  };

  const RenderLegend = () => (
    <Legend
      key={`legend-${id}`}
      labelText={texts.title}
      descriptionText={texts.description}
      helpText={texts.help}
      language={language}
      id={id}
      required={item.required}
      labelSettings={item.labelSettings}
      layout={('layout' in item && item.layout) || undefined}
    />
  );

  const getTextResourceWrapper = (key: string | undefined) => getTextResource(key, textResources);

  const getTextResourceAsString = (key: string | undefined) => getTextResourceByKey(key, textResources);

  const fixedComponentProps: IComponentProps = {
    handleDataChange,
    getTextResource: getTextResourceWrapper,
    getTextResourceAsString,
    formData,
    isValid,
    language,
    shouldFocus,
    text: texts.title,
    texts,
    label: RenderLabel,
    legend: RenderLegend,
    componentValidations,
  };

  const componentProps = {
    ...fixedComponentProps,
    node,
    overrideItemProps,
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
        {...gridBreakpoints(item.grid)}
        key={`grid-${id}`}
        className={classNames(
          'form-group',
          'a-form-group',
          classes.container,
          gridToClasses(item.grid?.labelGrid, classes),
          pageBreakStyles(item.pageBreak),
        )}
        alignItems='baseline'
      >
        {layoutComponent.renderWithLabel() && (
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
          {showValidationMessages && renderValidationMessagesForComponent(componentValidations?.simpleBinding, id)}
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
