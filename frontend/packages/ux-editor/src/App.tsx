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
import { PageSpinner } from './components/PageSpinner';
import { ErrorPage } from './components/ErrorPage';

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
  const layoutPagesOrder = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order
  );
  const layoutOrder = useSelector(
    (state: IAppState) =>
      state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.order
  );

  const selectedLayout = useSelector(
    (state: IAppState) => state.formDesigner.layout.selectedLayout
  );

  const dataModel = useSelector((state: IAppState) => state.appData.dataModel.model);
  const activeList = useSelector((state: IAppState) => state.formDesigner.layout.activeList);

  const isDataModelFetched = useSelector((state: IAppState) => state.appData.dataModel.fetched);
  const isLayoutSettingsFetched = useSelector(
    (state: IAppState) => state.formDesigner.layout.isLayoutSettingsFetched
  );
  const isLayoutFetched = useSelector((state: IAppState) => state.formDesigner.layout.fetched);
  const isWidgetFetched = useSelector((state: IAppState) => state.widgets.fetched);
  const isLanguageFetched = useSelector((state: IAppState) => state.appData.languageState.fetched);

  const dataModelFetchedError = useSelector((state: IAppState) => state.appData.dataModel.error);
  const layoutFetchedError = useSelector((state: IAppState) => state.formDesigner.layout.error);
  const widgetFetchedError = useSelector((state: IAppState) => state.widgets.error);
  const languageFetchedError = useSelector((state: IAppState) => state.appData.languageState.error);

  const componentIsReady =
    isLayoutFetched &&
    isWidgetFetched &&
    isLayoutSettingsFetched &&
    isDataModelFetched &&
    isLanguageFetched;

  const componentHasError =
    dataModelFetchedError || layoutFetchedError || widgetFetchedError || languageFetchedError;

  const mapErrorToDisplayError = (): { title: string; message: string } => {
    const defaultTitle = t('general.fetch_error_title');
    const defaultMessage = t('general.fetch_error_message');

    const createErrorMessage = (resource: string): { title: string; message: string } => ({
      title: `${defaultTitle} ${resource}`,
      message: defaultMessage
    });

    if (dataModelFetchedError) {
      return createErrorMessage(t('general.dataModel'));
    }
    if (layoutFetchedError) {
      return createErrorMessage(t('general.layout'));
    }
    if (widgetFetchedError) {
      return createErrorMessage(t('general.widget'));
    }
    if (languageFetchedError) {
      return createErrorMessage(t('general.language'));
    }

    return createErrorMessage(t('general.unknown_error'));
  };

  // Set Layout to first layout in the page set if none is selected.
  useEffect(() => {
    if (!searchParams.has('layout') && layoutPagesOrder[0]) {
      setSearchParams({ ...deepCopy(searchParams), layout: layoutPagesOrder[0] });
    }
    if (selectedLayout === 'default' && searchParams.has('layout')) {
      dispatch(
        FormLayoutActions.updateSelectedLayout({ selectedLayout: searchParams.get('layout'), org, app })
      );
    }
  }, [dispatch, layoutPagesOrder, searchParams, setSearchParams, selectedLayout]);

  useEffect(() => {
    const fetchFiles = () => {
      dispatch(fetchDataModel({ org, app }));
      dispatch(FormLayoutActions.fetchFormLayout({ org, app }));
      dispatch(
        loadTextResources({
          textResourcesUrl: (langCode) => textResourcesPath(org, app, langCode),
          languagesUrl: textLanguagesPath(org, app)
        })
      );
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
      const name = t('general.page') + (layoutPagesOrder.length + 1);
      dispatch(FormLayoutActions.addLayout({ layout: name, isReceiptPage: false, org, app }));
    }
  }, [selectedLayout]);

  if (componentHasError) {
    const mappedError = mapErrorToDisplayError();
    return <ErrorPage title={mappedError.title} message={mappedError.message} />;
  }

  if (componentIsReady) {
    return (
      <>
        <ErrorMessageComponent />
        <FormDesigner
          activeList={activeList}
          dataModel={dataModel}
          layoutOrder={layoutOrder}
          selectedLayout={selectedLayout}
        />
      </>
    );
  }
  return <PageSpinner text={t('general.loading')} />;
}
