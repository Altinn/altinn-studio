/* eslint-disable jsx-a11y/no-static-element-interactions */
import * as React from 'react';
import { Grid, makeStyles } from '@material-ui/core';
// import appTheme from 'altinn-shared/theme/altinnAppTheme';
import { componentHasValidationMessages,
  getComponentValidations,
  getDisplayFormDataForComponent } from 'src/utils/formComponentUtils';
import { shallowEqual, useSelector } from 'react-redux';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { ILayoutComponent } from 'src/features/form/layout';
import FormLayoutActions from '../../features/form/layout/formLayoutActions';
import { IComponentValidations, IRuntimeState } from '../../types';
import SummaryGroupComponent from './SummaryGroupComponent';
import SingleInputSummary from './SingleInputSummary';
import ErrorPaper from '../message/ErrorPaper';
import { AttachmentSummaryComponent } from './AttachmentSummaryComponent';

export interface ISummaryComponent {
  id: string;
  type: string;
  pageRef?: string;
  componentRef?: string;
  largeGroup?: boolean;
  index?: number;
  formData?: any;
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
  const {
    pageRef,
  } = props;

  const [componentValidations, setComponentValidations] = React.useState<IComponentValidations>({});
  const [hasValidationMessages, setHasValidationMessages] = React.useState(false);

  const summaryPageName = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const changeText = useSelector((state: IRuntimeState) => getTextFromAppOrDefault(
    'form_filler.summary_item_change',
    state.textResources.resources,
    state.language.language,
    null,
    true,
  ));
  const formValidations = useSelector((state: IRuntimeState) => state.formValidations.validations);
  const layout = useSelector((state: IRuntimeState) => state.formLayout.layouts[props.pageRef]);
  const formComponent = useSelector((state: IRuntimeState) => {
    return state.formLayout.layouts[props.pageRef].find(((c) => c.id === props.componentRef));
  });
  const goToCorrectPageLinkText = useSelector((state: IRuntimeState) => {
    return getTextFromAppOrDefault('form_filler.summary_go_to_correct_page',
      state.textResources.resources, state.language.language, [], true);
  });
  const formData = useSelector((state: IRuntimeState) => {
    if (formComponent.type.toLowerCase() === 'group') return undefined;
    return props.formData || getDisplayFormDataForComponent(
      state.formData.formData,
      formComponent as ILayoutComponent,
      state.textResources.resources,
      state.optionState.options,
    );
  }, shallowEqual);
  const title = useSelector((state: IRuntimeState) => {
    const titleKey = formComponent.textResourceBindings?.title;
    if (titleKey) {
      return getTextFromAppOrDefault(titleKey, state.textResources.resources, state.language.language, [], true);
    }
    return undefined;
  });

  const onChangeClick = () => {
    FormLayoutActions.updateCurrentView(pageRef, null, summaryPageName);
  };

  React.useEffect(() => {
    if (formComponent && formComponent.type.toLowerCase() !== 'group') {
      const componentId = props.index >= 0 ? `${props.componentRef}-${props.index}` : props.componentRef;
      const validations = getComponentValidations(formValidations, componentId, pageRef);
      setComponentValidations(validations);
      setHasValidationMessages(componentHasValidationMessages(validations));
    }
  }, [formValidations, layout, pageRef, formComponent, props.componentRef, props.index]);

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
      default:
        return (
          <SingleInputSummary
            onChangeClick={onChangeClick}
            label={title}
            hasValidationMessages={hasValidationMessages}
            changeText={changeText}
            {...props}
            formData={formData}
          />
        );
    }
  };

  return (
    <Grid container={true} className={classes.row}>
      {renderSummaryComponent()}
      {hasValidationMessages &&
        <Grid
          container={true}
          style={{ paddingTop: '12px' }}
          spacing={2}
        >
          {Object.keys(componentValidations).map((binding: string) => {
            return componentValidations[binding]?.errors?.map((validationText: string) => {
              return (
                <ErrorPaper
                  message={validationText}
                />
              );
            });
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
      }
    </Grid>
  );
}
