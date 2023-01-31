import * as React from 'react';
import { shallowEqual } from 'react-redux';

import { Grid, makeStyles } from '@material-ui/core';
import cn from 'classnames';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import ErrorPaper from 'src/components/message/ErrorPaper';
import SummaryComponentSwitch from 'src/components/summary/SummaryComponentSwitch';
import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { mapGroupComponents } from 'src/features/form/containers/formUtils';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { ComponentType } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import { getLayoutComponentObject } from 'src/layout/LayoutComponent';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import printStyles from 'src/styles/print.module.css';
import {
  componentHasValidationMessages,
  getComponentValidations,
  getDisplayFormDataForComponent,
} from 'src/utils/formComponentUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { ComponentExceptGroupAndSummary, ILayoutComponent, RenderableGenericComponent } from 'src/layout/layout';
import type { ILayoutCompSummary } from 'src/layout/Summary/types';
import type { IComponentValidations, IRuntimeState } from 'src/types';

export interface ISummaryComponent extends Omit<ILayoutCompSummary, 'type'> {
  formData?: any;
}

const useStyles = makeStyles({
  border: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottom: '1px dashed #008FD6',
  },
  link: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #008FD6',
    cursor: 'pointer',
    paddingLeft: 0,
  },
});

export function SummaryComponent(_props: ISummaryComponent) {
  const { id, grid, componentRef, display, ...groupProps } = _props;
  const { pageRef, formData, pageBreak } = _props;
  const classes = useStyles();
  const dispatch = useAppDispatch();
  const GetHiddenSelector = makeGetHidden();
  const [componentValidations, setComponentValidations] = React.useState<IComponentValidations>({});
  const [hasValidationMessages, setHasValidationMessages] = React.useState(false);
  const hidden = useAppSelector((state) => {
    if (GetHiddenSelector(state, { id })) {
      return true;
    }
    return !!(componentRef && GetHiddenSelector(state, { id: componentRef }));
  });
  const summaryPageName = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const changeText = useAppSelector(
    (state) =>
      state.language.language &&
      getTextFromAppOrDefault(
        'form_filler.summary_item_change',
        state.textResources.resources,
        state.language.language,
        [],
        true,
      ),
  );
  const formValidations = useAppSelector((state) => state.formValidations.validations);
  const layout = useAppSelector((state) =>
    state.formLayout.layouts && pageRef ? state.formLayout.layouts[pageRef] : undefined,
  );
  const attachments = useAppSelector((state: IRuntimeState) => state.attachments.attachments);
  const formComponent = useResolvedNode(componentRef)?.item;
  const layoutComponent = getLayoutComponentObject(formComponent?.type as ComponentExceptGroupAndSummary);
  const formComponentLegacy = useAppSelector(
    (state) =>
      (state.formLayout.layouts &&
        pageRef &&
        formComponent &&
        state.formLayout.layouts[pageRef]?.find(
          (c) => c.id === formComponent.baseComponentId || c.id === formComponent.id,
        )) ||
      undefined,
  );

  const goToCorrectPageLinkText = useAppSelector((state) => {
    return (
      state.language.language &&
      getTextFromAppOrDefault(
        'form_filler.summary_go_to_correct_page',
        state.textResources.resources,
        state.language.language,
        [],
        true,
      )
    );
  });
  const calculatedFormData = useAppSelector((state) => {
    if (!formComponent) {
      return undefined;
    }
    if (formComponent.type === 'Group') {
      return undefined;
    }
    if (
      (formComponent.type === 'FileUpload' || formComponent.type === 'FileUploadWithTag') &&
      Object.keys(formComponent.dataModelBindings || {}).length === 0
    ) {
      return undefined;
    }
    return (
      formData ||
      getDisplayFormDataForComponent(
        state.formData.formData,
        attachments,
        formComponent as ILayoutComponent,
        state.textResources.resources,
        state.optionState.options,
        state.formLayout.uiConfig.repeatingGroups,
        true,
      )
    );
  }, shallowEqual);
  const label = useAppSelector((state) => {
    const titleKey = formComponent?.textResourceBindings?.title;
    if (titleKey) {
      return (
        state.language.language &&
        getTextFromAppOrDefault(titleKey, state.textResources.resources, state.language.language, [], false)
      );
    }
    return undefined;
  });

  const onChangeClick = () => {
    if (!pageRef) {
      return;
    }

    dispatch(
      FormLayoutActions.updateCurrentView({
        newView: pageRef,
        returnToView: summaryPageName,
        focusComponentId: componentRef,
      }),
    );
  };

  React.useEffect(() => {
    if (formComponent && formComponent.type !== 'Group') {
      const validations =
        (componentRef && pageRef && getComponentValidations(formValidations, componentRef, pageRef)) || undefined;
      setComponentValidations(validations || {});
      setHasValidationMessages(componentHasValidationMessages(validations));
    }
  }, [formValidations, layout, pageRef, formComponent, componentRef]);

  if (hidden || !formComponent || !formComponentLegacy) {
    return null;
  }

  const change = {
    onChangeClick,
    changeText,
  };

  if (formComponentLegacy?.type === 'Group' && (!formComponentLegacy.maxCount || formComponentLegacy.maxCount <= 1)) {
    // Display children as summary components
    const groupComponents = mapGroupComponents(formComponentLegacy, layout);
    return (
      <DisplayGroupContainer
        key={id}
        container={formComponentLegacy}
        components={groupComponents}
        renderLayoutComponent={(child) => (
          <SummaryComponent
            id={`__summary__${child.id}`}
            componentRef={child.id}
            pageRef={groupProps.pageRef}
            largeGroup={groupProps.largeGroup}
            display={display}
          />
        )}
      />
    );
  } else if (layoutComponent?.getComponentType() === ComponentType.Presentation) {
    // Render non-input components as normal
    return <GenericComponent {...(formComponentLegacy as RenderableGenericComponent)} />;
  }

  const displayGrid = display && display.useComponentGrid ? formComponent?.grid : grid;
  return (
    <Grid
      item={true}
      xs={displayGrid?.xs || 12}
      sm={displayGrid?.sm || false}
      md={displayGrid?.md || false}
      lg={displayGrid?.lg || false}
      xl={displayGrid?.xl || false}
      data-testid={`summary-${id}`}
      className={cn({
        [printStyles['break-before']]: pageBreak?.breakBefore,
        [printStyles['break-after']]: pageBreak?.breakAfter,
      })}
    >
      <Grid
        container={true}
        className={cn({
          [classes.border]: !display?.hideBottomBorder,
        })}
      >
        <SummaryComponentSwitch
          id={id}
          change={change}
          formComponent={formComponentLegacy}
          label={label}
          hasValidationMessages={hasValidationMessages}
          formData={calculatedFormData}
          componentRef={componentRef}
          groupProps={groupProps}
          display={display}
        />
        {hasValidationMessages && !display?.hideValidationMessages && (
          <Grid
            container={true}
            style={{ paddingTop: '12px' }}
            spacing={2}
          >
            {Object.keys(componentValidations).map((binding: string) =>
              componentValidations[binding]?.errors?.map((validationText: string) => (
                <ErrorPaper
                  key={`key-${validationText}`}
                  message={validationText}
                />
              )),
            )}
            <Grid
              item={true}
              xs={12}
            >
              {!display?.hideChangeButton && (
                <button
                  className={classes.link}
                  onClick={onChangeClick}
                  type='button'
                >
                  {goToCorrectPageLinkText}
                </button>
              )}
            </Grid>
          </Grid>
        )}
      </Grid>
    </Grid>
  );
}
