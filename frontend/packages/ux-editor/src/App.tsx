import React, { useEffect } from 'react';
import { FormDesigner } from './containers/FormDesigner';
import { useText, useAppContext } from './hooks';
import { StudioPageSpinner, StudioPageError } from '@studio/components';
import { useDataModelMetadataQuery } from './hooks/queries/useDataModelMetadataQuery';
import { useWidgetsQuery } from './hooks/queries/useWidgetsQuery';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FormItemContextProvider } from './containers/FormItemContext';
import { cleanupStaleLocalStorageKeys } from './utils/localStorageUtils';
import { FormDesignerToolbar } from '@altinn/ux-editor/containers/FormDesignerToolbar';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */

export function App() {
  // Remove local storage keys that are no longer supported
  useEffect(() => {
    cleanupStaleLocalStorageKeys();
  }, []);

  const t = useText();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { isSuccess: areWidgetsFetched, isError: widgetFetchedError } = useWidgetsQuery(org, app);
  const { isSuccess: areLayoutSetsFetched, isError: layoutSetsFetchedError } = useLayoutSetsQuery(
    org,
    app,
  );
  const { isSuccess: isDataModelFetched, isError: dataModelFetchedError } =
    useDataModelMetadataQuery({
      org,
      app,
      layoutSetName: selectedFormLayoutSetName,
    });
  const { isSuccess: areTextResourcesFetched } = useTextResourcesQuery(org, app);

  const componentIsReady =
    areLayoutSetsFetched && areWidgetsFetched && isDataModelFetched && areTextResourcesFetched;

  const componentHasError = dataModelFetchedError || widgetFetchedError;

  const mapErrorToDisplayError = (): { title: string; message: string } => {
    const defaultTitle = t('general.fetch_error_title');
    const defaultMessage = t('general.fetch_error_message');

    const createErrorMessage = (resource: string): { title: string; message: string } => ({
      title: `${defaultTitle} ${resource}`,
      message: defaultMessage,
    });

    if (layoutSetsFetchedError) {
      return createErrorMessage(t('general.layout_sets'));
    }

    if (dataModelFetchedError) {
      return createErrorMessage(t('general.data_model'));
    }
    if (widgetFetchedError) {
      return createErrorMessage(t('general.widget'));
    }

    return createErrorMessage(t('general.unknown_error'));
  };

  const renderApp = () => {
    // Will show errorPage below layoutSetsSelector if any of the other requests have failed
    if (componentHasError) {
      const mappedError = mapErrorToDisplayError();
      return <StudioPageError title={mappedError.title} message={mappedError.message} />;
    }

    return (
      <FormItemContextProvider>
        <FormDesigner />
      </FormItemContextProvider>
    );
  };

  if (layoutSetsFetchedError) {
    // If error fetching layoutSets show errorPage on whole page
    const mappedError = mapErrorToDisplayError();
    return <StudioPageError title={mappedError.title} message={mappedError.message} />;
  }

  // If all requests are loaded and layoutSets are successfully fetched, show layoutSetsSelector and app
  if (componentIsReady) {
    return (
      <>
        <FormDesignerToolbar />
        {renderApp()}
      </>
    );
  }

  // If any requests are loading show spinner on whole page
  return <StudioPageSpinner showSpinnerTitle={false} spinnerTitle={t('ux_editor.loading_page')} />;
}
