import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey, getUserLanguage } from '../../../../../shared/src/utils/language';
import { IRuntimeState } from '../../../types';
import { WorkflowSteps } from '../workflow/typings';
import Render from './Render';
import { WorkflowStep } from './WorkflowStep';

export interface IFormFillerProps {
  applicationMetadata: any;
  formConfig: any;
  textResources: any[];
  workflowStep: WorkflowSteps;
}

const FormFiller = (props: IFormFillerProps) => {
  const [userLanguage, setUserLanguage] = React.useState('nb');
  const [workflowStep, setWorkflowStep] = React.useState(props.workflowStep);

  React.useEffect(() => {
    setUserLanguage(getUserLanguage());
  }, []);

  React.useEffect(() => {
    setWorkflowStep(props.workflowStep);
  }, [props]);

  return (
    <WorkflowStep
      header={
        props.applicationMetadata &&
          props.applicationMetadata.title[userLanguage] ? props.applicationMetadata.title[userLanguage] :
        getLanguageFromKey('general.ServiceName', props.textResources)
      }
      step={workflowStep}
    >
      <div className='row'>
        <Render />
      </div>
    </WorkflowStep>
  );
};

const mapStateToProps = (state: IRuntimeState): IFormFillerProps => {
  return {
    applicationMetadata: state.applicationMetadata.applicationMetadata,
    formConfig: state.formConfig,
    textResources: state.language.language,
    workflowStep: state.formWorkflow.state,
  };
};

export default connect(mapStateToProps)(FormFiller);
