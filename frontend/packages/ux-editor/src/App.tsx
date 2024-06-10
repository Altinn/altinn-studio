import React from 'react';
import { FormDesigner } from './containers/FormDesigner';
import { useAppContext } from './hooks';
import { StudioPageSpinner } from '@studio/components';
import { ErrorPage } from './components/ErrorPage';
import { useDataModelMetadataQuery } from './hooks/queries/useDataModelMetadataQuery';
import { useWidgetsQuery } from './hooks/queries/useWidgetsQuery';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FormItemContextProvider } from './containers/FormItemContext';
import { useTranslation } from 'react-i18next';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */

export function App() {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { isSuccess: areWidgetsFetched, isError: widgetFetchedError } = useWidgetsQuery(org, app);
  const { isSuccess: isDataModelFetched, isError: dataModelFetchedError } =
    useDataModelMetadataQuery(org, app, selectedFormLayoutSetName, undefined);
  const { isSuccess: areTextResourcesFetched } = useTextResourcesQuery(org, app);

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

  if (componentHasError) {
    const mappedError = mapErrorToDisplayError();
    return <ErrorPage title={mappedError.title} message={mappedError.message} />;
  }

  if (componentIsReady) {
    return (
      <FormItemContextProvider>
        <FormDesigner />
      </FormItemContextProvider>
    );
  }
  return <StudioPageSpinner showSpinnerTitle={false} spinnerTitle={t('ux_editor.loading_page')} />;
}
