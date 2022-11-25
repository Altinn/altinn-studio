import React, { useEffect } from 'react';
import postMessages from 'app-shared/utils/postMessages';
import { useDispatch } from 'react-redux';
import { ErrorMessageComponent } from './components/message/ErrorMessageComponent';
import FormDesigner from './containers/FormDesigner';
import { FormLayoutActions } from './features/formDesigner/formLayout/formLayoutSlice';
import { loadTextResources } from './features/appData/textResources/textResourcesSlice';
import { fetchWidgets, fetchWidgetSettings } from './features/widgets/widgetsSlice';
import { fetchDataModel } from './features/appData/dataModel/dataModelSlice';
import { fetchLanguage } from './features/appData/language/languageSlice';
import { fetchRuleModel } from './features/appData/ruleModel/ruleModelSlice';
import { fetchServiceConfiguration } from './features/serviceConfigurations/serviceConfigurationSlice';
import { useParams } from 'react-router-dom';
import { textResourcesPath } from 'app-shared/api-paths';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */

export function App() {
  const dispatch = useDispatch();
  const { org, app } = useParams();
  useEffect(() => {
    const fetchFiles = () => {
      dispatch(fetchDataModel());
      dispatch(FormLayoutActions.fetchFormLayout());
      const languageCode = 'nb';
      dispatch(loadTextResources({ url: textResourcesPath(org, app, languageCode) }));
      dispatch(fetchServiceConfiguration());
      dispatch(fetchRuleModel());
      dispatch(fetchLanguage({ languageCode }));
      dispatch(fetchWidgetSettings());
      dispatch(FormLayoutActions.fetchLayoutSettings());
      dispatch(fetchWidgets());
    };

    const shouldRefetchFiles = (event: any) => {
      if (event.data === postMessages.refetchFiles) {
        fetchFiles();
      }
    };

    window.addEventListener('message', shouldRefetchFiles);
    fetchFiles();
    return () => {
      window.removeEventListener('message', shouldRefetchFiles);
    };
  }, [dispatch, org, app]);

  return (
    <div>
      <ErrorMessageComponent />
      <FormDesigner />
    </div>
  );
}
