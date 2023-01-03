import * as React from 'react';
import { shallowEqual } from 'react-redux';

import { Grid, makeStyles } from '@material-ui/core';
import cn from 'classnames';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import ErrorPaper from 'src/components/message/ErrorPaper';
import SummaryComponentSwitch from 'src/components/summary/SummaryComponentSwitch';
import { useExpressionsForComponent } from 'src/features/expressions/useExpressions';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import printStyles from 'src/styles/print.module.css';
import {
  componentHasValidationMessages,
  getComponentValidations,
  getDisplayFormDataForComponent,
} from 'src/utils/formComponentUtils';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { ILayoutComponent } from 'src/layout/layout';
import type { ILayoutCompSummary } from 'src/layout/Summary/types';
import type { IComponentValidations, IRuntimeState } from 'src/types';

export interface ISummaryComponent extends Omit<ILayoutCompSummary, 'type'> {
  parentGroup?: string;
  index?: number;
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
  const { id, grid, ...summaryProps } = _props;
  const { componentRef, display, ...groupProps } = summaryProps;
  const { parentGroup, index, pageRef, formData, ...containerProps } = _props;
  const container = { ...containerProps, type: 'Summary' } as ILayoutCompSummary;
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
  const layout = useAppSelector((state) => state.formLayout.layouts && pageRef && state.formLayout.layouts[pageRef]);
  const attachments = useAppSelector((state: IRuntimeState) => state.attachments.attachments);
  const _formComponent = useAppSelector((state) => {
    return (
      (state.formLayout.layouts && pageRef && state.formLayout.layouts[pageRef]?.find((c) => c.id === componentRef)) ||
      undefined
    );
  });
  const formComponent = useExpressionsForComponent(_formComponent);
  const summaryComponent = useExpressionsForComponent(container);

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
    if (formComponent?.type === 'Group') {
      return undefined;
    }
    if (
      (formComponent?.type === 'FileUpload' || formComponent?.type === 'FileUploadWithTag') &&
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
      const componentId = typeof index === 'number' && index >= 0 ? `${componentRef}-${index}` : componentRef;
      const validations =
        (componentId && pageRef && getComponentValidations(formValidations, componentId, pageRef)) || undefined;
      setComponentValidations(validations || {});
      setHasValidationMessages(componentHasValidationMessages(validations));
    }
  }, [formValidations, layout, pageRef, formComponent, componentRef, index]);

  if (hidden) {
    return null;
  }
  const change = {
    onChangeClick,
    changeText,
  };

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
        [printStyles['break-before']]: summaryComponent.pageBreak?.breakBefore,
        [printStyles['break-after']]: summaryComponent.pageBreak?.breakAfter,
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
          formComponent={formComponent}
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
