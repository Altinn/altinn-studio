import React, { useEffect } from 'react';
import { FormDesigner } from './containers/FormDesigner';
import { useText } from './hooks';
import { StudioPageSpinner } from '@studio/components';
import { ErrorPage } from './components/ErrorPage';
import { useDatamodelMetadataQuery } from './hooks/queries/useDatamodelMetadataQuery';
import { useWidgetsQuery } from './hooks/queries/useWidgetsQuery';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { useLayoutSetsQuery } from './hooks/queries/useLayoutSetsQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelectedLayoutSetName } from './hooks/useSelectedLayoutSetName';
import { FormItemContextProvider } from './containers/FormItemContext';
import { useSelectedLayoutName } from './hooks/useSelectedLayoutName';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */

export function App() {
  const t = useText();
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSetName, setSelectedLayoutSetName, removeSelectedLayoutSetName } =
    useSelectedLayoutSetName();
  const { selectedLayoutName } = useSelectedLayoutName();
  const { data: layoutSets, isSuccess: areLayoutSetsFetched } = useLayoutSetsQuery(org, app);
  const { isSuccess: areWidgetsFetched, isError: widgetFetchedError } = useWidgetsQuery(org, app);
  const { isSuccess: isDatamodelFetched, isError: dataModelFetchedError } =
    useDatamodelMetadataQuery(org, app, selectedLayoutSetName);
  const { isSuccess: areTextResourcesFetched } = useTextResourcesQuery(org, app);

  useEffect(() => {
    if (
      areLayoutSetsFetched &&
      selectedLayoutSetName &&
      (!layoutSets || !layoutSets.sets.map((set) => set.id).includes(selectedLayoutSetName))
    )
      removeSelectedLayoutSetName();
  }, [areLayoutSetsFetched, layoutSets, selectedLayoutSetName, removeSelectedLayoutSetName]);

  const componentIsReady =
    areWidgetsFetched && isDatamodelFetched && areTextResourcesFetched && areLayoutSetsFetched;

  const componentHasError = dataModelFetchedError || widgetFetchedError;

  const mapErrorToDisplayError = (): { title: string; message: string } => {
    const defaultTitle = t('general.fetch_error_title');
    const defaultMessage = t('general.fetch_error_message');

    const createErrorMessage = (resource: string): { title: string; message: string } => ({
      title: `${defaultTitle} ${resource}`,
      message: defaultMessage,
    });

    if (dataModelFetchedError) {
      return createErrorMessage(t('general.dataModel'));
    }
    if (widgetFetchedError) {
      return createErrorMessage(t('general.widget'));
    }

    return createErrorMessage(t('general.unknown_error'));
  };

  useEffect(() => {
    if (selectedLayoutSetName === null && layoutSets) {
      // Only set layout set if layout sets exists and there is no layout set selected yet
      setSelectedLayoutSetName(layoutSets.sets[0].id);
    }
  }, [layoutSets, selectedLayoutSetName, setSelectedLayoutSetName]);

  if (componentHasError) {
    const mappedError = mapErrorToDisplayError();
    return <ErrorPage title={mappedError.title} message={mappedError.message} />;
  }

  if (componentIsReady) {
    return (
      <FormItemContextProvider>
        <FormDesigner
          selectedLayout={selectedLayoutName}
          selectedLayoutSet={selectedLayoutSetName}
        />
      </FormItemContextProvider>
    );
  }
  return <StudioPageSpinner showSpinnerTitle={false} spinnerTitle={t('ux_editor.loading_page')} />;
}
