import * as React from 'react';
import { connect } from 'react-redux';
import { AltinnContentLoader, AltinnContentIconFormData } from 'altinn-shared/components'
import { getLanguageFromKey, getUserLanguage } from 'altinn-shared/utils';
import { IRuntimeState, ProcessSteps } from '../../../types';
import { ProcessStep } from './ProcessStep';
import Render from './Render';

export interface IFormFillerProps {
  applicationMetadata: any;
  isLoading: boolean;
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
    <ProcessStep
      header={
        props.applicationMetadata &&
          props.applicationMetadata.title[userLanguage] ? props.applicationMetadata.title[userLanguage] :
          getLanguageFromKey('general.ServiceName', props.textResources)
      }
      step={processStep}
    >
      <div>
        {props.isLoading === false ? (
          <Render />
        ) : (
          <div style={{ marginTop: '2.5rem' }}>
            <AltinnContentLoader width={680} height={700}>
              <AltinnContentIconFormData/>
            </AltinnContentLoader>
          </div>
        )}
      </div>
    </ProcessStep>
  );
};

const mapStateToProps = (state: IRuntimeState): IFormFillerProps => {
  return {
    applicationMetadata: state.applicationMetadata.applicationMetadata,
    formConfig: state.formConfig,
    textResources: state.language.language,
    processStep: state.process.state,
    isLoading: state.isLoading.dataTask,
  };
};

export default connect(mapStateToProps)(FormFiller);
