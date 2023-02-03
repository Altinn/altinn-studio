import React, { useEffect } from 'react';
import postMessages from 'app-shared/utils/postMessages';
import { useDispatch, useSelector } from 'react-redux';
import { ErrorMessageComponent } from './components/message/ErrorMessageComponent';
import { FormDesigner } from './containers/FormDesigner';
import { FormLayoutActions } from './features/formDesigner/formLayout/formLayoutSlice';
import {
  loadLanguages,
  loadTextResources
} from './features/appData/textResources/textResourcesSlice';
import { fetchWidgets, fetchWidgetSettings } from './features/widgets/widgetsSlice';
import { fetchDataModel } from './features/appData/dataModel/dataModelSlice';
import { fetchLanguage } from './features/appData/language/languageSlice';
import { fetchRuleModel } from './features/appData/ruleModel/ruleModelSlice';
import { fetchServiceConfiguration } from './features/serviceConfigurations/serviceConfigurationSlice';
import { useParams, useSearchParams } from 'react-router-dom';
import { textLanguagesPath, textResourcesPath } from 'app-shared/api-paths';
import type { IAppState } from './types/global';
import { deepCopy } from 'app-shared/pure';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useText } from './hooks';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */

export function App() {
  const dispatch = useDispatch();
  const t = useText();
  const { org, app } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const layoutOrder = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order
  );
  const selectedLayout = useSelector(
    (state: IAppState) => state.formDesigner.layout.selectedLayout
  );

  // Set Layout to first layout in the page set if none is selected.
  useEffect(() => {
    if (!searchParams.has('layout') && layoutOrder[0]) {
      setSearchParams({ ...deepCopy(searchParams), layout: layoutOrder[0] });
    }
    if (selectedLayout === 'default' && searchParams.has('layout')) {
      dispatch(
        FormLayoutActions.updateSelectedLayout({ selectedLayout: searchParams.get('layout'), org, app })
      );
    }
  }, [dispatch, layoutOrder, searchParams, setSearchParams, selectedLayout]);

  useEffect(() => {
    const fetchFiles = () => {
      dispatch(fetchDataModel({ org, app }));
      dispatch(FormLayoutActions.fetchFormLayout({ org, app }));
      dispatch(loadTextResources({
        textResourcesUrl: (langCode) => textResourcesPath(org, app, langCode),
        languagesUrl: textLanguagesPath(org, app)
      }));
      dispatch(loadLanguages({ url: textLanguagesPath(org, app) }));
      dispatch(fetchServiceConfiguration({ org, app }));
      dispatch(fetchRuleModel({ org, app }));
      dispatch(fetchLanguage({ languageCode: DEFAULT_LANGUAGE }));
      dispatch(fetchWidgetSettings({ org, app }));
      dispatch(FormLayoutActions.fetchLayoutSettings({ org, app }));
      dispatch(fetchWidgets({ org, app }));
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

  // Make sure to create a new page when the last one is deleted!
  useEffect(() => {
    if (!selectedLayout) {
      const name = t('general.page') + (layoutOrder.length + 1);
      dispatch(FormLayoutActions.addLayout({ layout: name, isReceiptPage: false, org, app }));
    }
  }, [selectedLayout]);

  return (
    <div>
      <ErrorMessageComponent />
      <FormDesigner />
    </div>
  );
}
