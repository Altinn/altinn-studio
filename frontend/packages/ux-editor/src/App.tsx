import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormDesigner } from './containers/FormDesigner';
import { FormLayoutActions } from './features/formDesigner/formLayout/formLayoutSlice';
import { useText } from './hooks';
import { PageSpinner } from 'app-shared/components/PageSpinner';
import { ErrorPage } from './components/ErrorPage';
import { useDatamodelMetadataQuery } from './hooks/queries/useDatamodelMetadataQuery';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from './selectors/formLayoutSelectors';
import { useWidgetsQuery } from './hooks/queries/useWidgetsQuery';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { useLayoutSetsQuery } from './hooks/queries/useLayoutSetsQuery';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */

export function App() {
  const dispatch = useDispatch();
  const t = useText();
  const { org, app } = useStudioUrlParams();
  const selectedLayout = useSelector(selectedLayoutNameSelector);

  const selectedLayoutSetInPreviewFromLocalStorage = typedLocalStorage.getItem<string>(
    'layoutSet/' + app,
  );
  const selectedLayoutSetInPreview =
    selectedLayoutSetInPreviewFromLocalStorage !== ''
      ? selectedLayoutSetInPreviewFromLocalStorage
      : null;
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { isSuccess: areWidgetsFetched, isError: widgetFetchedError } = useWidgetsQuery(org, app);
  const { isSuccess: isDatamodelFetched, isError: dataModelFetchedError } =
    useDatamodelMetadataQuery(org, app);
  const { isSuccess: areTextResourcesFetched } = useTextResourcesQuery(org, app);

  const componentIsReady = areWidgetsFetched && isDatamodelFetched && areTextResourcesFetched;

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
    if (selectedLayoutSet === null && layoutSets) {
      // Only set layout set if layout sets exists and there is no layout set selected yet
      dispatch(FormLayoutActions.updateSelectedLayoutSet(layoutSets.sets[0].id));
      typedLocalStorage.setItem<string>('layoutSet/' + app, layoutSets.sets[0].id);
    }
  }, [dispatch, selectedLayoutSet, layoutSets, app]);

  useEffect(() => {
    const layoutSetInEditor = selectedLayoutSetInPreview ?? selectedLayoutSet;
    if (
      layoutSets &&
      layoutSetInEditor !== null &&
      layoutSetInEditor !== '' &&
      layoutSetInEditor !== ''
    ) {
      typedLocalStorage.setItem<string>('layoutSet/' + app, layoutSetInEditor);
      dispatch(FormLayoutActions.updateSelectedLayoutSet(layoutSetInEditor));
    }
  }, [dispatch, selectedLayoutSet, layoutSets, selectedLayoutSetInPreview, app]);

  if (componentHasError) {
    const mappedError = mapErrorToDisplayError();
    return <ErrorPage title={mappedError.title} message={mappedError.message} />;
  }

  if (componentIsReady) {
    return (
      <FormDesigner
        selectedLayout={selectedLayout}
        selectedLayoutSet={selectedLayoutSetInPreview ?? selectedLayoutSet}
      />
    );
  }
  return <PageSpinner />;
}
