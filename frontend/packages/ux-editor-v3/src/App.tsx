import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FormDesigner } from './containers/FormDesigner';
import { useText } from './hooks';
import { StudioPageSpinner } from '@studio/components-legacy';
import { ErrorPage } from './components/ErrorPage';
import { useDataModelMetadataQuery } from './hooks/queries/useDataModelMetadataQuery';
import { selectedLayoutNameSelector } from './selectors/formLayoutSelectors';
import { useWidgetsQuery } from './hooks/queries/useWidgetsQuery';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from './hooks/useAppContext';
import { FormItemContextProvider } from './containers/FormItemContext';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */

export function App() {
  const t = useText();
  const { org, app } = useStudioEnvironmentParams();
  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const { selectedLayoutSet, setSelectedLayoutSet, removeSelectedLayoutSet } = useAppContext();
  const { data: layoutSets, isSuccess: areLayoutSetsFetched } = useLayoutSetsQuery(org, app);
  const { isSuccess: areWidgetsFetched, isError: widgetFetchedError } = useWidgetsQuery(org, app);
  const { isSuccess: isDataModelFetched, isError: dataModelFetchedError } =
    useDataModelMetadataQuery(org, app, selectedLayoutSet, undefined);
  const { isSuccess: areTextResourcesFetched } = useTextResourcesQuery(org, app);

  useEffect(() => {
    if (
      areLayoutSetsFetched &&
      selectedLayoutSet &&
      (!layoutSets || !layoutSets.sets.map((set) => set.id).includes(selectedLayoutSet))
    )
      removeSelectedLayoutSet();
  }, [
    areLayoutSetsFetched,
    layoutSets,
    selectedLayoutSet,
    setSelectedLayoutSet,
    removeSelectedLayoutSet,
  ]);

  const componentIsReady = areWidgetsFetched && isDataModelFetched && areTextResourcesFetched;

  const componentHasError = dataModelFetchedError || widgetFetchedError;

  const mapErrorToDisplayError = (): { title: string; message: string } => {
    const defaultTitle = t('general.fetch_error_title');
    const defaultMessage = t('general.fetch_error_message');

    const createErrorMessage = (resource: string): { title: string; message: string } => ({
      title: `${defaultTitle} ${resource}`,
      message: defaultMessage,
    });

    if (dataModelFetchedError) {
      return createErrorMessage(t('general.data_model'));
    }
    if (widgetFetchedError) {
      return createErrorMessage(t('general.widget'));
    }

    return createErrorMessage(t('general.unknown_error'));
  };

  useEffect(() => {
    if (selectedLayoutSet === null && layoutSets) {
      // Only set layout set if layout sets exists and there is no layout set selected yet
      setSelectedLayoutSet(layoutSets.sets[0].id);
    }
  }, [setSelectedLayoutSet, selectedLayoutSet, layoutSets, app]);

  if (componentHasError) {
    const mappedError = mapErrorToDisplayError();
    return <ErrorPage title={mappedError.title} message={mappedError.message} />;
  }

  if (componentIsReady) {
    return (
      <FormItemContextProvider>
        <FormDesigner selectedLayout={selectedLayout} selectedLayoutSet={selectedLayoutSet} />
      </FormItemContextProvider>
    );
  }
  return <StudioPageSpinner spinnerTitle={t('ux_editor.loading_page')} />;
}
