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
import { languagePath, textResourcesPath } from 'app-shared/api-paths';
import type { IAppState } from './types/global';
import { deepCopy } from 'app-shared/pure';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useText } from './hooks';
import { PageSpinner } from './components/PageSpinner';
import { ErrorPage } from './components/PageError';

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

  const isDataModelFetchedError = useSelector((state: IAppState) => state.appData.dataModel.error);
  const isLayoutFetchedError = useSelector((state: IAppState) => state.formDesigner.layout.error);
  const isWidgetFetchedError = useSelector((state: IAppState) => state.widgets.error);

  const componentIsReady =
    isLayoutFetched && isWidgetFetched && isLayoutSettingsFetched && isDataModelFetched;
  const componentHasError = isDataModelFetchedError || isLayoutFetchedError || isWidgetFetchedError;

  const mappedErrorToErrorObject = (): Error => {
    if (isDataModelFetchedError) return isDataModelFetchedError;
    if (isLayoutFetchedError) return isLayoutFetchedError;
    if (isWidgetFetchedError) return isWidgetFetchedError;

    return {
      name: 'Unknown error',
      message: 'Uknown Error Occured'
    };
  };

  // Set Layout to first layout in the page set if none is selected.
  useEffect(() => {
    if (!searchParams.has('layout') && layoutPagesOrder[0]) {
      setSearchParams({ ...deepCopy(searchParams), layout: layoutPagesOrder[0] });
    }
    if (selectedLayout === 'default' && searchParams.has('layout')) {
      dispatch(
        FormLayoutActions.updateSelectedLayout({ selectedLayout: searchParams.get('layout') })
      );
    }
  }, [dispatch, layoutPagesOrder, searchParams, setSearchParams, selectedLayout]);

  useEffect(() => {
    const fetchFiles = () => {
      dispatch(fetchDataModel());
      dispatch(FormLayoutActions.fetchFormLayout());
      dispatch(
        loadTextResources({
          textResourcesUrl: (langCode) => textResourcesPath(org, app, langCode),
          languagesUrl: languagePath(org, app)
        })
      );
      dispatch(loadLanguages({ url: languagePath(org, app) }));
      dispatch(fetchServiceConfiguration());
      dispatch(fetchRuleModel());
      dispatch(fetchLanguage({ languageCode: DEFAULT_LANGUAGE }));
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

  // Make sure to create a new page when the last one is deleted!
  useEffect(() => {
    if (!selectedLayout) {
      const name = t('general.page') + (layoutPagesOrder.length + 1);
      dispatch(FormLayoutActions.addLayout({ layout: name, isReceiptPage: false }));
    }
  }, [selectedLayout]);

  if (componentHasError) {
    return <ErrorPage error={mappedErrorToErrorObject()} />;
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
