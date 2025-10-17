import React, { useEffect } from 'react';
import { FormDesigner } from './containers/FormDesigner';
import { useText, useAppContext } from './hooks';
import { StudioPageSpinner } from '@studio/components-legacy';
import { StudioPageError } from '@studio/components';
import { useDataModelMetadataQuery } from './hooks/queries/useDataModelMetadataQuery';
import { useWidgetsQuery } from './hooks/queries/useWidgetsQuery';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FormItemContextProvider } from './containers/FormItemContext';
import { cleanupStaleLocalStorageKeys } from './utils/localStorageUtils';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { FormDesignerToolbar } from '@altinn/ux-editor/containers/FormDesignerToolbar';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */

type ErrorKinds = {
  dataModelError: boolean;
  layoutSetsError: boolean;
  widgetError: boolean;
};

const mapErrorToDisplayError = (t, errors: ErrorKinds) => {
  const defaultTitle = t('general.fetch_error_title');
  const defaultMessage = t('general.fetch_error_message');
  const createErrorMessage = (resource) => ({
    title: `${defaultTitle} ${resource}`,
    message: defaultMessage,
  });

  if (errors.layoutSetsError) return createErrorMessage(t('general.layout_sets'));
  if (errors.dataModelError) return createErrorMessage(t('general.data_model'));
  if (errors.widgetError) return createErrorMessage(t('general.widget'));
  return createErrorMessage(t('general.unknown_error'));
};

export function App() {
  // Remove local storage keys that are no longer supported
  useEffect(() => {
    cleanupStaleLocalStorageKeys();
  }, []);

  const t = useText();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { status: widgetsStatus, isError: widgetFetchedError } = useWidgetsQuery(org, app);
  const { status: layoutSetsStatus, isError: layoutSetsFetchedError } = useLayoutSetsQuery(
    org,
    app,
  );
  const { status: layoutSetsExtendedStatus } = useLayoutSetsExtendedQuery(org, app);
  const { status: dataModelStatus, isError: dataModelFetchedError } = useDataModelMetadataQuery({
    org,
    app,
    layoutSetName: selectedFormLayoutSetName,
    hideDefault: true,
  });
  const { status: textsStatus, data: textResources } = useTextResourcesQuery(org, app);

  const { doReloadPreview } = usePreviewContext();
  useEffect(() => {
    doReloadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textResources]);

  const componentIsPending =
    widgetsStatus === 'pending' ||
    layoutSetsStatus === 'pending' ||
    layoutSetsExtendedStatus === 'pending' ||
    dataModelStatus === 'pending' ||
    textsStatus === 'pending';
  const componentIsReady =
    widgetsStatus === 'success' &&
    layoutSetsStatus === 'success' &&
    dataModelStatus === 'success' &&
    textsStatus === 'success';
  const componentHasError = widgetsStatus === 'error' || dataModelStatus === 'error';

  const errors: ErrorKinds = {
    layoutSetsError: layoutSetsFetchedError,
    dataModelError: dataModelFetchedError,
    widgetError: widgetFetchedError,
  };

  const mappedError = mapErrorToDisplayError(t, errors);

  if (layoutSetsFetchedError) {
    // If error fetching layoutSets show errorPage on whole page
    return <StudioPageError title={mappedError.title} message={mappedError.message} />;
  }

  if (!componentIsPending) {
    // If layoutSets are successfully fetched, show layoutSetsSelector and app
    return (
      <div>
        <FormDesignerToolbar />
        {componentHasError && (
          <StudioPageError title={mappedError.title} message={mappedError.message} />
        )}
        {componentIsReady && (
          <FormItemContextProvider>
            <FormDesigner />
          </FormItemContextProvider>
        )}
      </div>
    );
  }

  return <StudioPageSpinner spinnerTitle={t('ux_editor.loading_page')} />;
}
