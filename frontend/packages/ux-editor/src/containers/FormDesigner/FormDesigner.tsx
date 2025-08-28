import React, { useState } from 'react';
import { Properties } from '../../components/FormDesigner/Properties';
import { DesignView } from '../../components/FormDesigner/DesignView/DesignViewWithPageOrder';
import classes from './FormDesigner.module.css';
import { Elements } from '../../components/FormDesigner/Elements';
import { useFormItemContext } from './FormItemContext';
import { useAppContext, useText } from '../../hooks';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import {
  StudioDragAndDropTree,
  StudioPageError,
  StudioPageSpinner,
  StudioResizableLayout,
  useLocalStorage,
} from '@studio/components-legacy';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useRuleConfigQuery } from '../../hooks/queries/useRuleConfigQuery';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { HandleAdd, HandleMove } from 'app-shared/types/dndTypes';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { generateComponentId } from '../../utils/generateId';
import {
  addItemOfType,
  getItem,
  isComponentTypeValidChild,
  moveLayoutItem,
} from '../../utils/formLayoutUtils';
import { useAddItemToLayoutMutation } from '../../hooks/mutations/useAddItemToLayoutMutation';
import { useFormLayoutMutation } from '../../hooks/mutations/useFormLayoutMutation';
import { Preview } from '../../components/FormDesigner/Preview';
import { shouldDisplayFeature, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { ItemType } from '../components/Properties/ItemType';

export const FormDesigner = (): JSX.Element => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: user } = useUserQuery();
  const {
    selectedFormLayoutSetName,
    selectedFormLayoutName,
    updateLayoutsForPreview,
    setSelectedItem,
  } = useAppContext();
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
    selectedFormLayoutSetName && formLayouts && formLayoutSettings && isRuleConfigFetched;

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
    const triggerInvalidChildAlert = () => alert(t('schema_editor.error_invalid_child'));
    const layout = formLayouts[selectedFormLayoutName];

    const addItem: HandleAdd<ComponentType> = (type, { parentId, index }) => {
      const newId = generateComponentId(type, formLayouts);

      if (!isComponentTypeValidChild(layout, parentId, type)) {
        triggerInvalidChildAlert();
        return;
      }
      const updatedLayout = addItemOfType(layout, type, newId, parentId, index);
      addItemToLayout(
        { componentType: type, newId, parentId, index },
        {
          onSuccess: async () => {
            await updateLayoutsForPreview(selectedFormLayoutSetName);
          },
        },
      );
      handleEdit(getItem(updatedLayout, newId));
      setSelectedItem({ type: ItemType.Component, id: newId });
    };
    const moveItem: HandleMove = (id, { parentId, index }) => {
      const type = getItem(layout, id).type;
      if (!isComponentTypeValidChild(layout, parentId, type)) {
        triggerInvalidChildAlert();
        return;
      }
      const updatedLayout = moveLayoutItem(layout, id, parentId, index);
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
      <StudioDragAndDropTree.Provider rootId={BASE_CONTAINER_ID} onMove={moveItem} onAdd={addItem}>
        <div className={classes.root}>
          <div className={classes.container}>
            <StudioResizableLayout.Container
              orientation='horizontal'
              localStorageContext={`form-designer-main:${user.id}:${org}`}
            >
              {/**
               * The following check is done for a live user test behind feature flag. It can be removed if this is not something
               * that is going to be used in the future.
               */}
              {!shouldDisplayFeature(FeatureFlag.AddComponentModal) && (
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
              )}
              <StudioResizableLayout.Element
                minimumSize={shouldDisplayFeature(FeatureFlag.AddComponentModal) ? 600 : 250} // This check is done for a live user test behind feature flag. Revert to 250 if removing.
              >
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
      </StudioDragAndDropTree.Provider>
    );
  }
  return <StudioPageSpinner spinnerTitle={t('ux_editor.loading_form_layout')} />;
};
