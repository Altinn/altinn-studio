import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { RightMenu } from '../components/rightMenu/RightMenu';
import { DesignView } from './DesignView';
import classes from './FormDesigner.module.css';
import { LeftMenu } from '../components/leftMenu/LeftMenu';
import { FormContextProvider } from './FormContext';
import { useText } from '../hooks';
import { useAddLayoutMutation } from '../hooks/mutations/useAddLayoutMutation';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../hooks/queries/useFormLayoutSettingsQuery';
import { useRuleModelQuery } from '../hooks/queries/useRuleModelQuery';
import { ErrorPage } from '../components/ErrorPage';
import { PageSpinner } from 'app-shared/components';
import { BASE_CONTAINER_ID, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { useRuleConfigQuery } from '../hooks/queries/useRuleConfigQuery';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { HandleAdd, HandleMove } from 'app-shared/types/dndTypes';
import { ComponentType } from 'app-shared/types/ComponentType';
import { generateComponentId } from '../utils/generateId';
import { addItemOfType, moveLayoutItem, validateDepth } from '../utils/formLayoutUtils';
import { useAddItemToLayoutMutation } from '../hooks/mutations/useAddItemToLayoutMutation';
import { useFormLayoutMutation } from '../hooks/mutations/useFormLayoutMutation';
import { useSearchParams } from 'react-router-dom';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';

// TODO @David - Move function to utils
const setSelectedLayoutInLocalStorage = (instanceId: string, layoutName: string) => {
  if (instanceId) {
    // Need to use InstanceId as storage key since apps uses it and it is needed to sync layout between preview and editor
    localStorage.setItem(instanceId, layoutName);
  }
};

export interface FormDesignerProps {
  selectedLayout: string;
  selectedLayoutSet: string | undefined;
}

// TODO @David - Dette er rotfilen for Form Designer. Kanskje vi burde fikse mappestrukturen for disse filene nå mens vi er her?
export const FormDesigner = ({
  selectedLayout,
  selectedLayoutSet,
}: FormDesignerProps): JSX.Element => {
  const dispatch = useDispatch();
  const { org, app } = useStudioUrlParams();
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const { data: formLayouts, isError: layoutFetchedError } = useFormLayoutsQuery(
    org,
    app,
    selectedLayoutSet,
  );
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const { data: ruleModel } = useRuleModelQuery(org, app, selectedLayoutSet);
  const { isSuccess: isRuleConfigFetched } = useRuleConfigQuery(org, app, selectedLayoutSet);
  const addLayoutMutation = useAddLayoutMutation(org, app, selectedLayoutSet);
  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(org, app, selectedLayoutSet);
  const { mutate: updateFormLayout } = useFormLayoutMutation(
    org,
    app,
    selectedLayout,
    selectedLayoutSet,
  );
  const [searchParams] = useSearchParams();

  const layoutPagesOrder = formLayoutSettings?.pages.order;

  const layoutOrder = useMemo(
    () => formLayouts?.[selectedLayout]?.order || {},
    [formLayouts, selectedLayout],
  );
  const t = useText();

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
    const searchParamsLayout = searchParams.get('layout');
    // const searchParamsLayout = layout; // searchParams.get('layout');

    const isValidLayout = (layoutName: string): boolean => {
      const isExistingLayout = layoutPagesOrder?.includes(layoutName);
      const isReceipt = formLayoutSettings?.receiptLayoutName === layoutName;
      return isExistingLayout || isReceipt;
    };

    if (isValidLayout(searchParamsLayout)) {
      dispatch(FormLayoutActions.updateSelectedLayout(searchParamsLayout));
      setSelectedLayoutInLocalStorage(instanceId, searchParamsLayout);
      dispatch(FormLayoutActions.updateSelectedLayout(searchParamsLayout));
      return;
    }
  }, [dispatch, formLayoutSettings?.receiptLayoutName, instanceId, layoutPagesOrder, searchParams]);

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
    const triggerDepthAlert = () => alert(t('schema_editor.depth_error'));
    const layout = formLayouts[selectedLayout];

    const addItem: HandleAdd<ComponentType> = (type, { parentId, index }) => {
      const newId = generateComponentId(type, formLayouts);

      const updatedLayout = addItemOfType(layout, type, newId, parentId, index);
      if (validateDepth(updatedLayout)) {
        addItemToLayout({ componentType: type, newId, parentId, index });
      } else triggerDepthAlert();
    };
    const moveItem: HandleMove = (id, { parentId, index }) => {
      console.log('id', id);
      console.log('newContainerId', parentId);
      console.log('newPosition', index);
      const updatedLayout = moveLayoutItem(layout, id, parentId, index);
      validateDepth(updatedLayout) ? updateFormLayout(updatedLayout) : triggerDepthAlert();
    };

    return (
      <DragAndDrop.Provider rootId={BASE_CONTAINER_ID} onMove={moveItem} onAdd={addItem}>
        <div className={classes.root}>
          <div className={classes.container}>
            <LeftMenu className={classes.leftContent + ' ' + classes.item} />
            <FormContextProvider>
              <DesignView className={classes.mainContent + ' ' + classes.item} />
              <RightMenu className={classes.rightContent + ' ' + classes.item} />
            </FormContextProvider>
          </div>
        </div>
      </DragAndDrop.Provider>
    );
  }
  return <PageSpinner />;
};
