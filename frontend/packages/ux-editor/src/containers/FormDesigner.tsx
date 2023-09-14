import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RightMenu } from '../components/rightMenu/RightMenu';
import { DesignView } from './DesignView';
import classes from './FormDesigner.module.css';
import { LeftMenu } from '../components/leftMenu/LeftMenu';
import { FormContextProvider } from './FormContext';
import { useText } from '../hooks';
import { useSearchParams } from 'react-router-dom';
import { useAddLayoutMutation } from '../hooks/mutations/useAddLayoutMutation';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../hooks/queries/useFormLayoutSettingsQuery';
import { useRuleModelQuery } from '../hooks/queries/useRuleModelQuery';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import { ErrorPage } from '../components/ErrorPage';
import { PageSpinner } from 'app-shared/components';
import { DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { useRuleConfigQuery } from '../hooks/queries/useRuleConfigQuery';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

const setSelectedLayoutInLocalStorage = (instanceId: string, layoutName: string) => {
  if (instanceId) {
    // Need to use InstanceId as storage key since apps uses it and it is needed to sync layout between preview and editor
    localStorage.setItem(instanceId, layoutName);
  }
};

const getSelectedLayoutInLocalStorage = (instanceId: string): string => {
  if (instanceId) {
    return localStorage.getItem(instanceId);
  }
};

export interface FormDesignerProps {
  selectedLayout: string;
  selectedLayoutSet: string | undefined;
}

export const FormDesigner = ({
  selectedLayout,
  selectedLayoutSet,
}: FormDesignerProps): JSX.Element => {
  const dispatch = useDispatch();
  const { org, app } = useStudioUrlParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const { data: formLayouts, isError: layoutFetchedError } = useFormLayoutsQuery(
    org,
    app,
    selectedLayoutSet
  );
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const { data: ruleModel } = useRuleModelQuery(org, app, selectedLayoutSet);
  const { isSuccess: isRuleConfigFetched } = useRuleConfigQuery(org, app, selectedLayoutSet);
  const addLayoutMutation = useAddLayoutMutation(org, app, selectedLayoutSet);
  const layoutOrder = useMemo(
    () => formLayouts?.[selectedLayout]?.order || {},
    [formLayouts, selectedLayout]
  );
  const t = useText();

  const layoutPagesOrder = formLayoutSettings?.pages.order;

  const formLayoutIsReady =
    instanceId && formLayouts && formLayoutSettings && ruleModel && isRuleConfigFetched;

  const mapErrorToDisplayError = (): { title: string; message: string } => {
    const defaultTitle = t('general.fetch_error_title');
    const defaultMessage = t('general.fetch_error_message');

    const createErrorMessage = (resource: string): { title: string; message: string } => ({
      title: `${defaultTitle} ${resource}`,
      message: defaultMessage,
    });

    if (layoutFetchedError) {
      return createErrorMessage(t('general.layout'));
    }
  };

  /**
   * Set the correct selected layout based on url parameters
   */
  useEffect(() => {
    const firstLayoutPage = layoutPagesOrder?.[0];
    if (!firstLayoutPage) return;

    const localStorageLayout = getSelectedLayoutInLocalStorage(instanceId);
    const searchParamsLayout = searchParams.get('layout');

    const updateLayoutInSearchParams = (layout: string) => {
      setSearchParams((prevParams) => ({ ...prevParams, layout }));
    };

    const isValidLayout = (layoutName: string): boolean => {
      const isExistingLayout = layoutPagesOrder?.includes(layoutName);
      const isReceipt = formLayoutSettings?.receiptLayoutName === layoutName;
      return isExistingLayout || isReceipt;
    };

    if (isValidLayout(searchParamsLayout)) {
      dispatch(FormLayoutActions.updateSelectedLayout(searchParamsLayout));
      setSelectedLayoutInLocalStorage(instanceId, searchParamsLayout);
      return;
    }

    if (isValidLayout(localStorageLayout)) {
      dispatch(FormLayoutActions.updateSelectedLayout(localStorageLayout));
      updateLayoutInSearchParams(localStorageLayout);
      return;
    }

    updateLayoutInSearchParams(firstLayoutPage);
  }, [
    dispatch,
    formLayoutSettings?.receiptLayoutName,
    instanceId,
    layoutPagesOrder,
    searchParams,
    selectedLayout,
    setSearchParams,
  ]);

  useEffect((): void => {
    const addInitialPage = (): void => {
      const layoutName = `${t('general.page')}1`;
      addLayoutMutation.mutate({ layoutName, isReceiptPage: false });
    };

    const layoutsWithContentExist = layoutOrder && !Object.keys(layoutOrder).length;
    // Old apps might have selectedLayout='default' even when there exist a single layout.
    // Should only add initial page if no layouts exist.
    if (selectedLayout === DEFAULT_SELECTED_LAYOUT_NAME && !layoutsWithContentExist) {
      addInitialPage();
    }
  }, [app, dispatch, org, selectedLayout, t, layoutOrder, addLayoutMutation]);

  if (layoutFetchedError) {
    const mappedError = mapErrorToDisplayError();
    return <ErrorPage title={mappedError.title} message={mappedError.message} />;
  }

  if (formLayoutIsReady) {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className={classes.root}>
          <div className={classes.container}>
            <LeftMenu className={classes.leftContent + ' ' + classes.item} />
            <FormContextProvider>
              <DesignView className={classes.mainContent + ' ' + classes.item} />
              <RightMenu className={classes.rightContent + ' ' + classes.item} />
            </FormContextProvider>
          </div>
        </div>
      </DndProvider>
    );
  }
  return <PageSpinner />;
};
