import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ErrorMessageComponent } from './components/message/ErrorMessageComponent';
import { FormDesigner } from './containers/FormDesigner';
import { FormLayoutActions } from './features/formDesigner/formLayout/formLayoutSlice';
import { useParams, useSearchParams } from 'react-router-dom';
import { deepCopy } from 'app-shared/pure';
import { useText } from './hooks';
import { PageSpinner } from 'app-shared/components/PageSpinner';
import { ErrorPage } from './components/ErrorPage';
import { useDatamodelQuery } from './hooks/queries/useDatamodelQuery';
import { useFormLayoutsQuery } from './hooks/queries/useFormLayoutsQuery';
import { selectedLayoutNameSelector } from './selectors/formLayoutSelectors';
import { useFormLayoutSettingsQuery } from './hooks/queries/useFormLayoutSettingsQuery';
import { useTextResourcesQuery } from '../../../app-development/hooks/queries/useTextResourcesQuery';
import { useRuleModelQuery } from './hooks/queries/useRuleModelQuery';
import { firstAvailableLayout } from './utils/formLayoutsUtils';
import { DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { useRuleConfigQuery } from './hooks/queries/useRuleConfigQuery';
import { useWidgetsQuery } from './hooks/queries/useWidgetsQuery';
import { useInstanceIdQuery } from './hooks/queries/useInstanceIdQuery';

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

  const { isSuccess: isDatamodelFetched, isError: dataModelFetchedError } = useDatamodelQuery(org, app);
  const { data: formLayouts, isError: layoutFetchedError } = useFormLayoutsQuery(org, app);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app);
  const { isSuccess: areTextResourcesFetched } = useTextResourcesQuery(org, app);
  const { isSuccess: isRuleModelFetched } = useRuleModelQuery(org, app);
  const { isSuccess: isRuleConfigFetched } = useRuleConfigQuery(org, app);
  const { isSuccess: areWidgetsFetched, isError: widgetFetchedError } = useWidgetsQuery(org, app);
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const selectedLayout = useSelector(selectedLayoutNameSelector);

  const layoutPagesOrder = formLayoutSettings?.pages.order;

  const componentIsReady =
    formLayouts &&
    areWidgetsFetched &&
    formLayoutSettings &&
    isDatamodelFetched &&
    areTextResourcesFetched &&
    isRuleModelFetched &&
    isRuleConfigFetched;

  const componentHasError = dataModelFetchedError || layoutFetchedError || widgetFetchedError;

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
    if (layoutFetchedError) {
      return createErrorMessage(t('general.layout'));
    }
    if (widgetFetchedError) {
      return createErrorMessage(t('general.widget'));
    }

    return createErrorMessage(t('general.unknown_error'));
  };

  /**
   * Set the correct selected layout based on url parameters
   */
  useEffect(() => {
    if (searchParams.has('deletedLayout')) {
      const layoutToSelect = firstAvailableLayout(
        searchParams.get('deletedLayout'),
        layoutPagesOrder
      );
      dispatch(FormLayoutActions.updateSelectedLayout(layoutToSelect));
      setSearchParams(
        layoutToSelect !== DEFAULT_SELECTED_LAYOUT_NAME ? { layout: layoutToSelect } : {}
      );
    } else if (!searchParams.has('layout') && layoutPagesOrder?.[0]) {
      setSearchParams({ ...deepCopy(searchParams), layout: layoutPagesOrder[0] });
      dispatch(FormLayoutActions.updateSelectedLayout(layoutPagesOrder[0]));
    } else if (searchParams.has('layout')) {
      dispatch(FormLayoutActions.updateSelectedLayout(searchParams.get('layout')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, layoutPagesOrder, selectedLayout, org, app]);

  useEffect(() => {
    localStorage.setItem(instanceId, selectedLayout);
  }, [selectedLayout, instanceId]);

  if (componentHasError) {
    const mappedError = mapErrorToDisplayError();
    return <ErrorPage title={mappedError.title} message={mappedError.message} />;
  }

  if (componentIsReady) {
    return (
      <>
        <ErrorMessageComponent />
        <FormDesigner selectedLayout={selectedLayout} />
      </>
    );
  }
  return <PageSpinner text={t('general.loading')} />;
}
