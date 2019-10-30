import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey, getUserLanguage } from '../../../../../shared/src/utils/language';
import { IRuntimeState } from '../../../types';
import { ProcessSteps } from './../../../sharedResources/process/typings';
import Render from './Render';
import { WorkflowStep } from './WorkflowStep';

export interface IFormFillerProps {
  applicationMetadata: any;
  formConfig: any;
  textResources: any[];
  processStep: ProcessSteps;
}

const FormFiller = (props: IFormFillerProps) => {
  const [userLanguage, setUserLanguage] = React.useState('nb');
  const [processStep, setProcessStep] = React.useState(props.processStep);

  React.useEffect(() => {
    setUserLanguage(getUserLanguage());
  }, []);

  React.useEffect(() => {
    setProcessStep(props.processStep);
  }, [props]);

  return (
    <WorkflowStep
      header={
        props.applicationMetadata &&
          props.applicationMetadata.title[userLanguage] ? props.applicationMetadata.title[userLanguage] :
        getLanguageFromKey('general.ServiceName', props.textResources)
      }
      step={processStep}
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
    processStep: state.process.state,
  };
};

export default connect(mapStateToProps)(FormFiller);
