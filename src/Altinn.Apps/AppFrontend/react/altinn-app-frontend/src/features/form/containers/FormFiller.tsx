import * as React from 'react';
import { useSelector } from 'react-redux';
import { AltinnContentLoader, AltinnContentIconFormData } from 'altinn-shared/components'
import { getLanguageFromKey, getUserLanguage } from 'altinn-shared/utils';
import { IRuntimeState, ProcessSteps } from '../../../types';
import { ProcessStep } from './ProcessStep';
import Render from './Render';
import UnknownError from '../../instantiate/containers/UnknownError';

const FormFiller = () => {
  const [userLanguage, setUserLanguage] = React.useState('nb');

  const applicationMetadata: any = useSelector((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  const isLoading: boolean = useSelector((state: IRuntimeState) => state.isLoading.dataTask);
  const textResources: any[] = useSelector((state: IRuntimeState) => state.language.language);
  const processStep: ProcessSteps = useSelector((state: IRuntimeState) => state.process.state);
  const queue: any = useSelector((state: IRuntimeState) => state.queue);

  React.useEffect(() => {
    setUserLanguage(getUserLanguage());
  }, []);

  if (queue.dataTask.error || queue.appTask.error) {
    return <UnknownError />
  }

  return (
    <ProcessStep
      header={
        applicationMetadata &&
          applicationMetadata.title[userLanguage] ? applicationMetadata.title[userLanguage] :
          getLanguageFromKey('general.ServiceName', textResources)
      }
      step={processStep}
    >
      <div>
        {isLoading === false ? (
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

export default FormFiller;
