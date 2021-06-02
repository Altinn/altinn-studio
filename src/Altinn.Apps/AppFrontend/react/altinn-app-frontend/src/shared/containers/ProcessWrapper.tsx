/* eslint-disable react/prop-types */
import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AltinnContentLoader, AltinnContentIconFormData } from 'altinn-shared/components';
import { getTextResourceByKey } from 'altinn-shared/utils';
import InstanceDataActions from '../resources/instanceData/instanceDataActions';
import ProcessDispatcher from '../resources/process/processDispatcher';
import { IRuntimeState, ProcessTaskType, IAltinnWindow } from '../../types';
import Presentation from './Presentation';
// eslint-disable-next-line import/no-named-as-default
import Form from '../../features/form/containers/Form';
import ReceiptContainer from '../../features/receipt/containers/receiptContainer';
import Confirm from '../../features/confirm/containers/Confirm';
import UnknownError from '../../features/instantiate/containers/UnknownError';
import { startInitialDataTaskQueue, startInitialInfoTaskQueue } from '../resources/queue/queueSlice';
import { makeGetHasErrorsSelector } from '../../selectors/getErrors';
import Feedback from '../../features/feedback/Feedback';
import { IProcessState } from '../resources/process/processReducer';
import { finishDataTaskIsLoading } from '../resources/isLoading/isLoadingSlice';

export default (props) => {
  const {
    match: {
      params: {
        partyId,
        instanceGuid,
      },
    },
  } = props;
  const dispatch = useDispatch();
  const [userLanguage, setUserLanguage] = React.useState('nb');
  const [appHeader, setAppHeader] = React.useState('');

  const instantiating = useSelector((state: IRuntimeState) => state.instantiation.instantiating);
  const instanceId = useSelector((state: IRuntimeState) => state.instantiation.instanceId);
  const instanceData = useSelector((state: IRuntimeState) => state.instanceData.instance);
  const applicationMetadata: any = useSelector((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  const isLoading: boolean = useSelector((state: IRuntimeState) => state.isLoading.dataTask);
  const serviceName: string = useSelector((state: IRuntimeState) => getTextResourceByKey('ServiceName', state.textResources.resources));
  const process: IProcessState = useSelector((state: IRuntimeState) => state.process);
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors = useSelector(hasErrorSelector);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);

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
          return applicationMetadata.title[userLanguage] || applicationMetadata.title.nb;
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
      case (ProcessTaskType.Data): {
        dispatch(startInitialDataTaskQueue());
        break;
      }
      case (ProcessTaskType.Confirm):
      case (ProcessTaskType.Feedback):
        dispatch(startInitialInfoTaskQueue());
        break;
      case (ProcessTaskType.Archived): {
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
    <Presentation
      header={appHeader}
      type={process.taskType}
    >
      <div>
        {isLoading === false ? (
          <>
            {process.taskType === ProcessTaskType.Data &&
              <Form />
            }
            {process.taskType === ProcessTaskType.Archived &&
              <div id='ReceiptContainer'>
                <ReceiptContainer/>
              </div>
            }
            {process.taskType === ProcessTaskType.Confirm &&
              <div id='ConfirmContainer'>
                <Confirm />
              </div>
            }
            {process.taskType === ProcessTaskType.Feedback &&
              <div id='FeedbackContainer'>
                <Feedback />
              </div>
            }
          </>
        ) : (
          <div style={{ marginTop: '2.5rem' }}>
            <AltinnContentLoader width={680} height={700}>
              <AltinnContentIconFormData/>
            </AltinnContentLoader>
          </div>
        )}
      </div>
    </Presentation>
  );
};
