import * as React from 'react';
import { Grid, makeStyles } from '@material-ui/core';
import {
  componentHasValidationMessages,
  getComponentValidations,
  getDisplayFormDataForComponent,
} from 'src/utils/formComponentUtils';
import { shallowEqual } from 'react-redux';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import {
  IGrid,
  ILayoutComponent,
} from 'src/features/form/layout';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { IComponentValidations } from 'src/types';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import ErrorPaper from '../message/ErrorPaper';
import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import SummaryComponentSwitch from 'src/components/summary/SummaryComponentSwitch';

export interface ISummaryComponent {
  id: string;
  componentRef?: string;
  pageRef?: string;
  parentGroup?: string;
  largeGroup?: boolean;
  index?: number;
  formData?: any;
  grid?: IGrid;
}

const useStyles = makeStyles({
  row: {
    borderBottom: '1px dashed #008FD6',
    marginBottom: 10,
    paddingBottom: 10,
  },
  link: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #008FD6',
    cursor: 'pointer',
    paddingLeft: 0,
  },
});

export function SummaryComponent({ id, grid, ...summaryProps }: ISummaryComponent) {
  const { componentRef, ...groupProps } = summaryProps;
  const { pageRef, index } = groupProps;
  const classes = useStyles();
  const dispatch = useAppDispatch();
  const GetHiddenSelector = makeGetHidden();
  const [componentValidations, setComponentValidations] =
    React.useState<IComponentValidations>({});
  const [hasValidationMessages, setHasValidationMessages] =
    React.useState(false);
  const hidden: boolean = useAppSelector((state) =>
    GetHiddenSelector(state, { id }),
  );
  const summaryPageName = useAppSelector(
    (state) => state.formLayout.uiConfig.currentView,
  );
  const changeText = useAppSelector((state) =>
    getTextFromAppOrDefault(
      'form_filler.summary_item_change',
      state.textResources.resources,
      state.language.language,
      null,
      true,
    ),
  );
  const formValidations = useAppSelector(
    (state) => state.formValidations.validations,
  );
  const layout = useAppSelector(
    (state) => state.formLayout.layouts[pageRef],
  );
  const formComponent = useAppSelector((state) => {
    return state.formLayout.layouts[pageRef].find(
      (c) => c.id === componentRef,
    );
  });
  const goToCorrectPageLinkText = useAppSelector((state) => {
    return getTextFromAppOrDefault(
      'form_filler.summary_go_to_correct_page',
      state.textResources.resources,
      state.language.language,
      [],
      true,
    );
  });
  const formData = useAppSelector((state) => {
    if (
      formComponent.type.toLowerCase() === 'group' ||
      formComponent.type.toLowerCase() === 'fileupload' ||
      formComponent.type.toLowerCase() === 'fileuploadwithtag'
    )
      return undefined;
    return (
      summaryProps.formData ||
      getDisplayFormDataForComponent(
        state.formData.formData,
        formComponent as ILayoutComponent,
        state.textResources.resources,
        state.optionState.options,
        true,
      )
    );
  }, shallowEqual);
  const label = useAppSelector((state) => {
    const titleKey = formComponent.textResourceBindings?.title;
    if (titleKey) {
      return getTextFromAppOrDefault(
        titleKey,
        state.textResources.resources,
        state.language.language,
        [],
        false,
      );
    }
    return undefined;
  });

  const onChangeClick = () => {
    dispatch(
      FormLayoutActions.updateCurrentView({
        newView: pageRef,
        runValidations: null,
        returnToView: summaryPageName,
      }),
    );
  };

  React.useEffect(() => {
    if (formComponent && formComponent.type.toLowerCase() !== 'group') {
      const componentId =
        index >= 0
          ? `${componentRef}-${index}`
          : componentRef;
      const validations = getComponentValidations(
        formValidations,
        componentId,
        pageRef,
      );
      setComponentValidations(validations);
      setHasValidationMessages(componentHasValidationMessages(validations));
    }
  }, [
    formValidations,
    layout,
    pageRef,
    formComponent,
    componentRef,
    index,
  ]);

  if (hidden) {
    return null;
  }
  const change = {
    onChangeClick,
    changeText,
  };
  return (
    <Grid
      item={true}
      xs={grid?.xs || 12}
      sm={grid?.sm || false}
      md={grid?.md || false}
      lg={grid?.lg || false}
      xl={grid?.xl || false}
    >
      <Grid container={true} className={classes.row}>
        <SummaryComponentSwitch
          change={change}
          formComponent={formComponent}
          label={label}
          hasValidationMessages={hasValidationMessages}
          formData={formData}
          componentRef={componentRef}
          groupProps={groupProps}
        />
        {hasValidationMessages && (
          <Grid container={true} style={{ paddingTop: '12px' }} spacing={2}>
            {Object.keys(componentValidations).map((binding: string) =>
              componentValidations[binding]?.errors?.map(
                (validationText: string) => (
                  <ErrorPaper
                    key={`key-${validationText}`}
                    message={validationText}
                  />
                ),
              ),
            )}
            <Grid item={true} xs={12}>
              <button
                className={classes.link}
                onClick={onChangeClick}
                type='button'
              >
                {goToCorrectPageLinkText}
              </button>
            </Grid>
          </Grid>
        )}
      </Grid>
    </Grid>
  );
}
