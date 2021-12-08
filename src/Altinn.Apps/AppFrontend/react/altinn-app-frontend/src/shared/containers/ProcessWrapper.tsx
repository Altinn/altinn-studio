import * as React from 'react';
import {
  AltinnContentLoader,
  AltinnContentIconFormData,
} from 'altinn-shared/components';
import { getTextResourceByKey } from 'altinn-shared/utils';
import InstanceDataActions from '../resources/instanceData/instanceDataActions';
import ProcessDispatcher from '../resources/process/processDispatcher';
import { ProcessTaskType, IAltinnWindow } from '../../types';
import Presentation from './Presentation';
import { Form } from '../../features/form/containers/Form';
import ReceiptContainer from '../../features/receipt/containers/receiptContainer';
import Confirm from '../../features/confirm/containers/Confirm';
import UnknownError from '../../features/instantiate/containers/UnknownError';
import {
  startInitialDataTaskQueue,
  startInitialInfoTaskQueue,
} from '../resources/queue/queueSlice';
import { makeGetHasErrorsSelector } from '../../selectors/getErrors';
import Feedback from '../../features/feedback/Feedback';
import { finishDataTaskIsLoading } from '../resources/isLoading/isLoadingSlice';
import { useAppDispatch, useAppSelector } from 'src/common/hooks';

const style = {
  marginTop: '2.5rem',
};

const ProcessWrapper = (props) => {
  const {
    // eslint-disable-next-line react/prop-types
    match: {
      // eslint-disable-next-line react/prop-types
      params: { partyId, instanceGuid },
    },
  } = props;

  const dispatch = useAppDispatch();
  const [userLanguage, setUserLanguage] = React.useState('nb');
  const [appHeader, setAppHeader] = React.useState('');

  const instantiating = useAppSelector(state => state.instantiation.instantiating);
  const instanceId = useAppSelector(state => state.instantiation.instanceId);
  const instanceData = useAppSelector(state => state.instanceData.instance);
  const applicationMetadata = useAppSelector(state => state.applicationMetadata.applicationMetadata);
  const isLoading = useAppSelector(state => state.isLoading.dataTask);
  const serviceName = useAppSelector(state => getTextResourceByKey('ServiceName', state.textResources.resources));
  const process = useAppSelector(state => state.process);
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors = useAppSelector(hasErrorSelector);
  const profile = useAppSelector(state => state.profile.profile);

  (window as Window as IAltinnWindow).instanceId = `${partyId}/${instanceGuid}`;

  React.useEffect(() => {
    if (profile && profile.profileSettingPreference) {
      setUserLanguage(profile.profileSettingPreference.language);
    }
  }, [profile]);

  React.useEffect(() => {
    const getHeaderText = () => {
      const appNameKey = 'ServiceName';
      let appName;
      if (serviceName) {
        appName = serviceName;
      }

      if (appName && appName === appNameKey) {
        if (applicationMetadata) {
          return (
            applicationMetadata.title[userLanguage] ||
            applicationMetadata.title.nb
          );
        }
      }
      return appName;
    };
    setAppHeader(getHeaderText());
  }, [serviceName, applicationMetadata]);

  React.useEffect(() => {
    if (!applicationMetadata || !instanceData) {
      return;
    }

    if (!process || !process.taskType) {
      ProcessDispatcher.getProcessState();
    }

    switch (process.taskType) {
      case ProcessTaskType.Data: {
        dispatch(startInitialDataTaskQueue());
        break;
      }
      case ProcessTaskType.Confirm:
      case ProcessTaskType.Feedback:
        dispatch(startInitialInfoTaskQueue());
        break;
      case ProcessTaskType.Archived: {
        dispatch(finishDataTaskIsLoading());
        break;
      }
      default:
        break;
    }
  }, [process, applicationMetadata, instanceData]);

  React.useEffect(() => {
    if (!instantiating && !instanceId) {
      InstanceDataActions.getInstanceData(partyId, instanceGuid);
    }
  }, [instantiating, instanceId]);

  if (hasApiErrors) {
    return <UnknownError />;
  }

  if (!process || !process.taskType) {
    return null;
  }

  return (
    <Presentation header={appHeader} type={process.taskType}>
      <div>
        {isLoading === false ? (
          <>
            {process.taskType === ProcessTaskType.Data && <Form />}
            {process.taskType === ProcessTaskType.Archived && (
              <div id='ReceiptContainer'>
                <ReceiptContainer />
              </div>
            )}
            {process.taskType === ProcessTaskType.Confirm && (
              <div id='ConfirmContainer'>
                <Confirm />
              </div>
            )}
            {process.taskType === ProcessTaskType.Feedback && (
              <div id='FeedbackContainer'>
                <Feedback />
              </div>
            )}
          </>
        ) : (
          <div style={style}>
            <AltinnContentLoader width='100%' height={700}>
              <AltinnContentIconFormData />
            </AltinnContentLoader>
          </div>
        )}
      </div>
    </Presentation>
  );
};

export default ProcessWrapper;
