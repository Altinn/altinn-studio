import * as React from 'react';
import { hot } from 'react-hot-loader';
import postMessages from 'app-shared/utils/postMessages';
import { Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ErrorMessageComponent } from './components/message/ErrorMessageComponent';
import FormDesigner from './containers/FormDesigner';
import { FormLayoutActions } from './features/formDesigner/formLayout/formLayoutSlice';
import { loadTextResources } from './features/appData/textResources/textResourcesSlice';
import { fetchWidgets, fetchWidgetSettings } from './features/widgets/widgetsSlice';
import { getLoadTextResourcesUrl } from './utils/urlHelper';
import { fetchDataModel } from './features/appData/dataModel/dataModelSlice';
import { fetchLanguage } from './features/appData/language/languageSlice';
import { fetchRuleModel } from './features/appData/ruleModel/ruleModelSlice';
import { fetchServiceConfiguration } from './features/serviceConfigurations/serviceConfigurationSlice';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */

export function App() {
  const dispatch = useDispatch();

  const fetchFiles = () => {
    dispatch(fetchDataModel());
    dispatch(FormLayoutActions.fetchFormLayout());

    const languageCode = 'nb';
    dispatch(loadTextResources({ url: getLoadTextResourcesUrl(languageCode) }));
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

  React.useEffect(() => {
    window.addEventListener('message', shouldRefetchFiles);
    fetchFiles();
    return () => { window.removeEventListener('message', shouldRefetchFiles); };
  }, []);

  const renderFormDesigner = (): JSX.Element => {
    return <FormDesigner />;
  };

  return (
    <div>
      <ErrorMessageComponent />
      <Route
        exact={true}
        path='/ui-editor'
        render={renderFormDesigner}
      />
    </div>
  );
}

export default hot(module)(App);
