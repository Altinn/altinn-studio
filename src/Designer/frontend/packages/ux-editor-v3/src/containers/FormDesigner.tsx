import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Properties } from '../components/Properties';
import { DesignView } from './DesignView';
import classes from './FormDesigner.module.css';
import { Elements } from '../components/Elements';
import { useFormItemContext } from './FormItemContext';
import { useText } from '../hooks';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../hooks/queries/useFormLayoutSettingsQuery';
import { useRuleModelQuery } from '../hooks/queries/useRuleModelQuery';
import { ErrorPage } from '../components/ErrorPage';
import { StudioPageSpinner } from '@studio/components-legacy';
import { StudioDragAndDropTree } from '@studio/components';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useRuleConfigQuery } from '../hooks/queries/useRuleConfigQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { HandleAdd, HandleMove } from 'app-shared/types/dndTypes';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { generateComponentId } from '../utils/generateId';
import {
  addItemOfType,
  getItem,
  moveLayoutItem,
  isComponentTypeValidChild,
  validateDepth,
} from '../utils/formLayoutUtils';
import { useAddItemToLayoutMutation } from '../hooks/mutations/useAddItemToLayoutMutation';
import { useFormLayoutMutation } from '../hooks/mutations/useFormLayoutMutation';
import { useSearchParams } from 'react-router-dom';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import { Preview } from '../components/Preview';

export interface FormDesignerProps {
  selectedLayout: string;
  selectedLayoutSet: string | undefined;
}

export const FormDesigner = ({
  selectedLayout,
  selectedLayoutSet,
}: FormDesignerProps): JSX.Element => {
  const dispatch = useDispatch();
  const { org, app } = useStudioEnvironmentParams();
  const { data: formLayouts, isError: layoutFetchedError } = useFormLayoutsQuery(
    org,
    app,
    selectedLayoutSet,
  );
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const { data: ruleModel } = useRuleModelQuery(org, app, selectedLayoutSet);
  const { isSuccess: isRuleConfigFetched } = useRuleConfigQuery(org, app, selectedLayoutSet);
  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(org, app, selectedLayoutSet);
  const { mutate: updateFormLayout } = useFormLayoutMutation(
    org,
    app,
    selectedLayout,
    selectedLayoutSet,
  );
  const [searchParams] = useSearchParams();
  const { handleEdit } = useFormItemContext();

  const layoutPagesOrder = formLayoutSettings?.pages.order;

  const t = useText();

  const formLayoutIsReady = formLayouts && formLayoutSettings && ruleModel && isRuleConfigFetched;

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

    const isValidLayout = (layoutName: string): boolean => {
      const isExistingLayout = layoutPagesOrder?.includes(layoutName);
      const isReceipt = formLayoutSettings?.receiptLayoutName === layoutName;
      return isExistingLayout || isReceipt;
    };

    if (isValidLayout(searchParamsLayout)) {
      dispatch(FormLayoutActions.updateSelectedLayout(searchParamsLayout));
      dispatch(FormLayoutActions.updateSelectedLayout(searchParamsLayout));
      return;
    }
  }, [dispatch, formLayoutSettings?.receiptLayoutName, layoutPagesOrder, searchParams]);

  if (layoutFetchedError) {
    const mappedError = mapErrorToDisplayError();
    return <ErrorPage title={mappedError.title} message={mappedError.message} />;
  }

  if (formLayoutIsReady) {
    const triggerDepthAlert = () => alert(t('schema_editor.error_depth'));
    const triggerInvalidChildAlert = () => alert(t('schema_editor.error_invalid_child'));
    const layout = formLayouts[selectedLayout];

    const addItem: HandleAdd<ComponentTypeV3> = (type, { parentId, index }) => {
      const newId = generateComponentId(type, formLayouts);

      if (!isComponentTypeValidChild(layout, parentId, type)) {
        triggerInvalidChildAlert();
        return;
      }
      const updatedLayout = addItemOfType(layout, type, newId, parentId, index);
      if (!validateDepth(updatedLayout)) {
        triggerDepthAlert();
        return;
      }
      addItemToLayout({ componentType: type, newId, parentId, index });
      handleEdit(getItem(updatedLayout, newId));
    };
    const moveItem: HandleMove = (id, { parentId, index }) => {
      const type = getItem(layout, id).type;
      if (!isComponentTypeValidChild(layout, parentId, type)) {
        triggerInvalidChildAlert();
        return;
      }
      const updatedLayout = moveLayoutItem(layout, id, parentId, index);
      if (!validateDepth(updatedLayout)) {
        triggerDepthAlert();
        return;
      }
      updateFormLayout(updatedLayout);
    };

    return (
      <StudioDragAndDropTree.Provider rootId={BASE_CONTAINER_ID} onMove={moveItem} onAdd={addItem}>
        <div className={classes.root}>
          <div className={classes.container}>
            <Elements />
            <DesignView />
            <Properties />
            <Preview />
          </div>
        </div>
      </StudioDragAndDropTree.Provider>
    );
  }
  return <StudioPageSpinner spinnerTitle={t('ux_editor.loading_form_layout')} />;
};
