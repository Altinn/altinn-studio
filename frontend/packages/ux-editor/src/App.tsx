import React, { useEffect } from 'react';
import postMessages from 'app-shared/utils/postMessages';
import { useDispatch, useSelector } from 'react-redux';
import { ErrorMessageComponent } from './components/message/ErrorMessageComponent';
import { FormDesigner } from './containers/FormDesigner';
import { FormLayoutActions } from './features/formDesigner/formLayout/formLayoutSlice';
import { fetchWidgets, fetchWidgetSettings } from './features/widgets/widgetsSlice';
import { fetchRuleModel } from './features/appData/ruleModel/ruleModelSlice';
import { fetchServiceConfiguration } from './features/serviceConfigurations/serviceConfigurationSlice';
import { useParams, useSearchParams } from 'react-router-dom';
import type { IAppState } from './types/global';
import { deepCopy } from 'app-shared/pure';
import { useText } from './hooks';
import { PageSpinner } from 'app-shared/components/PageSpinner';
import { ErrorPage } from './components/ErrorPage';
import { useDatamodelQuery } from './hooks/queries/useDatamodelQuery';
import { useFormLayoutsQuery } from './hooks/queries/useFormLayoutsQuery';
import { selectedLayoutNameSelector } from './selectors/formLayoutSelectors';
import { useAddLayoutMutation } from './hooks/mutations/useAddLayoutMutation';
import { useFormLayoutSettingsQuery } from './hooks/queries/useFormLayoutSettingsQuery';
import { useTextResourcesQuery } from './hooks/queries/useTextResourcesQuery';

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

  const { data: datamodel, isError: dataModelFetchedError } = useDatamodelQuery(org, app);
  const { data: formLayouts, isError: layoutFetchedError  } = useFormLayoutsQuery(org, app);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app);
  const { data: textResources } = useTextResourcesQuery(org, app);
  const addLayoutMutation = useAddLayoutMutation(org, app);

  const selectedLayout = useSelector(selectedLayoutNameSelector);

  const layoutPagesOrder = formLayoutSettings?.pages.order;
  const layoutOrder = formLayouts?.[selectedLayout]?.order || {};

  const activeList = useSelector((state: IAppState) => state.formDesigner.layout.activeList);

  const isWidgetFetched = useSelector((state: IAppState) => state.widgets.fetched);
  const widgetFetchedError = useSelector((state: IAppState) => state.widgets.error);

  const componentIsReady =
    formLayouts &&
    isWidgetFetched &&
    formLayoutSettings &&
    datamodel &&
    textResources;

  const componentHasError =
    dataModelFetchedError || layoutFetchedError || widgetFetchedError;

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

    return createErrorMessage(t('general.unknown_error'));
  };

  // Set Layout to first layout in the page set if none is selected.
  useEffect(() => {
    if (!searchParams.has('layout') && layoutPagesOrder?.[0]) {
      setSearchParams({ ...deepCopy(searchParams), layout: layoutPagesOrder[0] });
    }
    if (selectedLayout === 'default' && searchParams.has('layout')) {
      dispatch(FormLayoutActions.updateSelectedLayout(searchParams.get('layout')));
    }
  }, [dispatch, layoutPagesOrder, searchParams, setSearchParams, selectedLayout, org, app]);

  useEffect(() => {
    const fetchFiles = () => {
      dispatch(fetchServiceConfiguration({ org, app }));
      dispatch(fetchRuleModel({ org, app }));
      dispatch(fetchWidgetSettings({ org, app }));
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
    if (!selectedLayout && layoutPagesOrder.length === 0) {
      const layoutName = t('general.page') + (layoutPagesOrder.length + 1);
      addLayoutMutation.mutate({ layoutName, isReceiptPage: false });
    }
  }, [app, dispatch, layoutOrder?.length, layoutPagesOrder?.length, org, selectedLayout, t, addLayoutMutation]);

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
          layoutOrder={layoutOrder}
          selectedLayout={selectedLayout}
        />
      </>
    );
  }
  return <PageSpinner text={t('general.loading')} />;
}
