import * as React from 'react';
import { Grid, makeStyles } from '@material-ui/core';
// import appTheme from 'altinn-shared/theme/altinnAppTheme';
import { componentHasValidationMessages,
  getComponentValidations,
  getDisplayFormDataForComponent } from 'src/utils/formComponentUtils';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { shallowEqual, useSelector } from 'react-redux';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { ILayoutComponent } from 'src/features/form/layout';
import FormLayoutActions from '../../features/form/layout/formLayoutActions';
import { IComponentValidations, IRuntimeState } from '../../types';
import SummaryGroupComponent from './SummaryGroupComponent';
import SingleInputSummary from './SingleInputSummary';

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
});

export function SummaryComponent(props: ISummaryComponent) {
  const classes = useStyles();
  const {
    pageRef,
  } = props;

  const [componentValidations, setComponentValidations] = React.useState<IComponentValidations>({});
  const [hasValidationMessages, setHasValidationMessages] = React.useState(false);

  const summaryPageName = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const formValidations = useSelector((state: IRuntimeState) => state.formValidations.validations);
  const layout = useSelector((state: IRuntimeState) => state.formLayout.layouts[props.pageRef]);
  const formComponent = useSelector((state: IRuntimeState) => {
    return state.formLayout.layouts[props.pageRef].find(((c) => c.id === props.componentRef));
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
    FormLayoutActions.updateCurrentView(pageRef, summaryPageName);
  };

  React.useEffect(() => {
    if (formComponent && formComponent.type.toLowerCase() !== 'group') {
      const validations = getComponentValidations(formValidations, props.id, props.componentRef, layout);
      setComponentValidations(validations);
      setHasValidationMessages(componentHasValidationMessages(validations));
    }
  }, [formValidations, layout]);

  return (
    <Grid container={true} className={classes.row}>
      {formComponent && formComponent.type.toLowerCase() === 'group' ?
        <SummaryGroupComponent
          onChangeClick={onChangeClick}
          {...props}
        />
        :
        <SingleInputSummary
          onChangeClick={onChangeClick}
          label={title}
          hasValidationMessages={hasValidationMessages}
          {...props}
          formData={formData}
        />
      }
      {hasValidationMessages &&
            renderValidationMessagesForComponent(componentValidations?.simpleBinding, props.id)
      }
    </Grid>
  );
}
