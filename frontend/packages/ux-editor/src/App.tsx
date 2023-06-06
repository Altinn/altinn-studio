import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ErrorMessageComponent } from './components/message/ErrorMessageComponent';
import { FormDesigner } from './containers/FormDesigner';
import { FormLayoutActions } from './features/formDesigner/formLayout/formLayoutSlice';
import { useParams } from 'react-router-dom';
import { useText } from './hooks';
import { PageSpinner } from 'app-shared/components/PageSpinner';
import { ErrorPage } from './components/ErrorPage';
import { useDatamodelQuery } from './hooks/queries/useDatamodelQuery';
import { selectedLayoutNameSelector, selectedLayoutSetSelector } from './selectors/formLayoutSelectors';
import { useWidgetsQuery } from './hooks/queries/useWidgetsQuery';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { useInstanceIdQuery } from 'app-shared/hooks/queries/useInstanceIdQuery';
import { useLayoutSetsQuery } from './hooks/queries/useLayoutSetsQuery';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */

export function App() {
  const dispatch = useDispatch();
  const t = useText();
  const { org, app } = useParams();

  const { data: instanceId } = useInstanceIdQuery(org, app);
  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { isSuccess: areWidgetsFetched, isError: widgetFetchedError } = useWidgetsQuery(org, app);
  const { isSuccess: isDatamodelFetched, isError: dataModelFetchedError } = useDatamodelQuery(org, app);
  const { isSuccess: areTextResourcesFetched } = useTextResourcesQuery(org, app);

  const componentIsReady =
    areWidgetsFetched &&
    isDatamodelFetched &&
    areTextResourcesFetched;

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
    if (selectedLayoutSet === null && layoutSets){
      dispatch(FormLayoutActions.updateSelectedLayoutSet(layoutSets.sets[0].id));
    }
  }, [dispatch, selectedLayoutSet, layoutSets]);

  useEffect(() => {
    localStorage.setItem(instanceId, selectedLayout);
    localStorage.setItem('layoutSetName', layoutSets ? selectedLayoutSet : '');
  }, [selectedLayout, instanceId, selectedLayoutSet, layoutSets]);

  if (componentHasError) {
    const mappedError = mapErrorToDisplayError();
    return <ErrorPage title={mappedError.title} message={mappedError.message} />;
  }

  if (componentIsReady) {
    return (
      <>
        <ErrorMessageComponent />
        <FormDesigner
          selectedLayout={selectedLayout}
          selectedLayoutSet={selectedLayoutSet}/>
      </>
    );
  }
  return <PageSpinner text={t('general.loading')} />;
}
