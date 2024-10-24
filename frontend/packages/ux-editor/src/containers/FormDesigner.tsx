import React, { useState } from 'react';
import { Properties } from '../components/Properties';
import { DesignView } from './DesignView';
import classes from './FormDesigner.module.css';
import { Elements } from '../components/Elements';
import { useFormItemContext } from './FormItemContext';
import { useAppContext, useText } from '../hooks';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../hooks/queries/useFormLayoutSettingsQuery';
import {
  StudioPageError,
  StudioPageSpinner,
  StudioResizableLayout,
  useLocalStorage,
} from '@studio/components';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useRuleConfigQuery } from '../hooks/queries/useRuleConfigQuery';
import { useInstanceIdQuery, useUserQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { HandleAdd, HandleMove } from 'app-shared/types/dndTypes';
import type { ComponentType } from 'app-shared/types/ComponentType';
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
import { Preview } from '../components/Preview';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';

export const FormDesigner = (): JSX.Element => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const { data: user } = useUserQuery();
  const { selectedFormLayoutSetName, selectedFormLayoutName, updateLayoutsForPreview } =
    useAppContext();
  const { data: formLayouts, isError: layoutFetchedError } = useFormLayoutsQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { isSuccess: isRuleConfigFetched } = useRuleConfigQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { mutate: updateFormLayout } = useFormLayoutMutation(
    org,
    app,
    selectedFormLayoutName,
    selectedFormLayoutSetName,
  );
  const { handleEdit } = useFormItemContext();
  const [previewCollapsed, setPreviewCollapsed] = useLocalStorage<boolean>(
    `form-designer-main:previewCollapsed:${user.id}:${org}`,
    false,
  );
  const [elementsCollapsed, setElementsCollapsed] = useLocalStorage<boolean>(
    `form-designer-main:elementsCollapsed:${user.id}:${org}`,
    false,
  );
  const [hidePreview, setHidePreview] = useState<boolean>(false);

  const t = useText();

  const formLayoutIsReady =
    selectedFormLayoutSetName &&
    instanceId &&
    formLayouts &&
    formLayoutSettings &&
    isRuleConfigFetched;

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

  if (layoutFetchedError) {
    const mappedError = mapErrorToDisplayError();
    return <StudioPageError title={mappedError.title} message={mappedError.message} />;
  }

  if (formLayoutIsReady) {
    const triggerDepthAlert = () => alert(t('schema_editor.depth_error'));
    const triggerInvalidChildAlert = () => alert(t('schema_editor.invalid_child_error'));
    const layout = formLayouts[selectedFormLayoutName];

    const addItem: HandleAdd<ComponentType> = (type, { parentId, index }) => {
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
      addItemToLayout(
        { componentType: type, newId, parentId, index },
        {
          onSuccess: async () => {
            await updateLayoutsForPreview(selectedFormLayoutSetName);
          },
        },
      );
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
      updateFormLayout(
        { internalLayout: updatedLayout },
        {
          onSuccess: async () => {
            await updateLayoutsForPreview(selectedFormLayoutSetName);
          },
        },
      );
    };

    return (
      <DragAndDropTree.Provider rootId={BASE_CONTAINER_ID} onMove={moveItem} onAdd={addItem}>
        <div className={classes.root}>
          <div className={classes.container}>
            <StudioResizableLayout.Container
              orientation='horizontal'
              localStorageContext={`form-designer-main:${user.id}:${org}`}
            >
              <StudioResizableLayout.Element
                collapsed={elementsCollapsed}
                collapsedSize={50}
                minimumSize={300}
                maximumSize={300}
                disableRightHandle={true}
              >
                <Elements
                  collapsed={elementsCollapsed}
                  onCollapseToggle={() => setElementsCollapsed(!elementsCollapsed)}
                />
              </StudioResizableLayout.Element>
              <StudioResizableLayout.Element minimumSize={250}>
                <DesignView />
              </StudioResizableLayout.Element>
              <StudioResizableLayout.Element
                minimumSize={250}
                onResizing={(resizing) => setHidePreview(resizing)}
              >
                <Properties />
              </StudioResizableLayout.Element>
              <StudioResizableLayout.Element
                collapsed={previewCollapsed}
                collapsedSize={50}
                minimumSize={400}
              >
                <Preview
                  collapsed={previewCollapsed}
                  onCollapseToggle={() => setPreviewCollapsed(!previewCollapsed)}
                  hidePreview={hidePreview}
                />
              </StudioResizableLayout.Element>
            </StudioResizableLayout.Container>
          </div>
        </div>
      </DragAndDropTree.Provider>
    );
  }
  return <StudioPageSpinner spinnerTitle={t('ux_editor.loading_form_layout')} />;
};
