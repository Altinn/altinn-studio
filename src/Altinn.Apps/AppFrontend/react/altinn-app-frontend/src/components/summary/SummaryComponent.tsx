/* eslint-disable jsx-a11y/no-static-element-interactions */
import * as React from 'react';
import { Grid, makeStyles } from '@material-ui/core';
// import appTheme from 'altinn-shared/theme/altinnAppTheme';
import {
  componentHasValidationMessages,
  getComponentValidations,
  getDisplayFormDataForComponent,
} from 'src/utils/formComponentUtils';
import { shallowEqual } from 'react-redux';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { IGrid, ILayoutComponent, ISelectionComponentProps } from 'src/features/form/layout';
import { FormLayoutActions } from '../../features/form/layout/formLayoutSlice';
import { IComponentValidations } from '../../types';
import SummaryGroupComponent from './SummaryGroupComponent';
import SingleInputSummary from './SingleInputSummary';
import ErrorPaper from '../message/ErrorPaper';
import { makeGetHidden } from '../../selectors/getLayoutData';
import { AttachmentSummaryComponent } from './AttachmentSummaryComponent';
import { AttachmentWithTagSummaryComponent } from './AttachmentWithTagSummaryComponent';
import MultipleChoiceSummary from './MultipleChoiceSummary';
import { useAppDispatch, useAppSelector } from 'src/common/hooks';

export interface ISummaryComponent {
  id: string;
  type: string;
  pageRef?: string;
  componentRef?: string;
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

export function SummaryComponent(props: ISummaryComponent) {
  const classes = useStyles();
  const dispatch = useAppDispatch();
  const { pageRef, id } = props;
  const GetHiddenSelector = makeGetHidden();
  const [componentValidations, setComponentValidations] =
    React.useState<IComponentValidations>({});
  const [hasValidationMessages, setHasValidationMessages] = React.useState(false);
  const hidden: boolean = useAppSelector(state => GetHiddenSelector(state, { id }));
  const summaryPageName = useAppSelector(state => state.formLayout.uiConfig.currentView);
  const changeText = useAppSelector(state =>
    getTextFromAppOrDefault(
      'form_filler.summary_item_change',
      state.textResources.resources,
      state.language.language,
      null,
      true,
    ),
  );
  const formValidations = useAppSelector(state => state.formValidations.validations);
  const layout = useAppSelector(state => state.formLayout.layouts[props.pageRef]);
  const formComponent = useAppSelector(state => {
    return state.formLayout.layouts[props.pageRef].find(
      (c) => c.id === props.componentRef,
    );
  });
  const goToCorrectPageLinkText = useAppSelector(state => {
    return getTextFromAppOrDefault(
      'form_filler.summary_go_to_correct_page',
      state.textResources.resources,
      state.language.language,
      [],
      true,
    );
  });
  const formData = useAppSelector(state => {
    if (formComponent.type.toLowerCase() === 'group') return undefined;
    return (
      props.formData ||
      getDisplayFormDataForComponent(
        state.formData.formData,
        formComponent as ILayoutComponent,
        state.textResources.resources,
        state.optionState.options,
        true,
      )
    );
  }, shallowEqual);
  const title = useAppSelector(state => {
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
        props.index >= 0
          ? `${props.componentRef}-${props.index}`
          : props.componentRef;
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
    props.componentRef,
    props.index,
  ]);

  const renderSummaryComponent = () => {
    if (!formComponent) {
      return null;
    }

    switch (formComponent.type) {
      case 'Group':
      case 'group': {
        return (
          <SummaryGroupComponent
            onChangeClick={onChangeClick}
            changeText={changeText}
            {...props}
          />
        );
      }
      case 'FileUpload': {
        return (
          <AttachmentSummaryComponent
            onChangeClick={onChangeClick}
            label={title}
            hasValidationMessages={hasValidationMessages}
            componentRef={props.componentRef}
            changeText={changeText}
          />
        );
      }
      case 'FileUploadWithTag': {
        return (
          <AttachmentWithTagSummaryComponent
            onChangeClick={onChangeClick}
            label={title}
            hasValidationMessages={hasValidationMessages}
            componentRef={props.componentRef}
            changeText={changeText}
            component={formComponent as ISelectionComponentProps}
          />
        );
      }
      case 'Checkboxes': {
        return (
          <MultipleChoiceSummary
            onChangeClick={onChangeClick}
            label={title}
            hasValidationMessages={hasValidationMessages}
            changeText={changeText}
            {...props}
            formData={formData}
            readOnlyComponent={(formComponent as ILayoutComponent).readOnly}
          />
        );
      }
      default:
        return (
          <SingleInputSummary
            onChangeClick={onChangeClick}
            label={title}
            hasValidationMessages={hasValidationMessages}
            changeText={changeText}
            {...props}
            formData={formData}
            readOnlyComponent={(formComponent as ILayoutComponent).readOnly}
          />
        );
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <Grid
      item={true}
      xs={props.grid?.xs || 12}
      sm={props.grid?.sm || false}
      md={props.grid?.md || false}
      lg={props.grid?.lg || false}
      xl={props.grid?.xl || false}
    >
      <Grid container={true} className={classes.row}>
        {renderSummaryComponent()}
        {hasValidationMessages && (
          <Grid
            container={true}
            style={{ paddingTop: '12px' }}
            spacing={2}
          >
            {Object.keys(componentValidations).map((binding: string) => {
              return componentValidations[binding]?.errors?.map(
                (validationText: string) => {
                  return (
                    // eslint-disable-next-line react/jsx-key
                    <ErrorPaper message={validationText} />
                  );
                },
              );
            })}
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
