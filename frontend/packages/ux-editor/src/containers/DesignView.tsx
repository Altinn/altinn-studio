import React from 'react';
import { useSelector } from 'react-redux';
import { FormContainer } from './FormContainer';
import type { FormContainer as IFormContainer } from '../types/FormContainer';
import type { FormComponent as IFormComponent } from '../types/FormComponent';
import type {
  ExistingDndItem,
  HandleDrop,
  ItemPosition,
  NewDndItem,
} from 'app-shared/types/dndTypes';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from '../selectors/formLayoutSelectors';
import { FormComponent } from '../components/FormComponent';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutMutation } from '../hooks/mutations/useFormLayoutMutation';
import { generateComponentId } from '../utils/generateId';
import { addItemOfType, moveLayoutItem, validateDepth } from '../utils/formLayoutUtils';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useFormContext } from './FormContext';
import { ConnectDragSource } from 'react-dnd';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useAddItemToLayoutMutation } from '../hooks/mutations/useAddItemToLayoutMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { ComponentType } from 'app-shared/types/ComponentType';

export interface DesignViewProps {
  className?: string;
}

export const DesignView = ({ className }: DesignViewProps) => {
  const { org, app } = useStudioUrlParams();
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
  const { data: layouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const layoutName = useSelector(selectedLayoutNameSelector);
  const { mutate: updateFormLayout } = useFormLayoutMutation(
    org,
    app,
    layoutName,
    selectedLayoutSet
  );
  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(org, app, selectedLayoutSet);
  const { formId, form, handleDiscard, handleEdit, handleSave, debounceSave } = useFormContext();

  const { t } = useTranslation();

  const layout = layouts?.[layoutName];

  const { order, containers, components } = layout || {};

  const triggerDepthAlert = () => alert(t('schema_editor.depth_error'));

  const addItem = (item: NewDndItem<ComponentType>, { parentId, index }: ItemPosition) => {
    const newId = generateComponentId(item.payload, layouts);
    const updatedLayout = addItemOfType(layout, item.payload, newId, parentId, index);
    if (validateDepth(updatedLayout)) {
      addItemToLayout({ componentType: item.payload, newId, parentId, index });
    } else triggerDepthAlert();
  };
  const moveItem = (item: ExistingDndItem, { parentId, index }: ItemPosition) => {
    const updatedLayout = moveLayoutItem(layout, item.id, parentId, index);
    validateDepth(updatedLayout) ? updateFormLayout(updatedLayout) : triggerDepthAlert();
  };

  const handleDrop: HandleDrop<ComponentType> = (item, position) =>
    item.isNew === true ? addItem(item, position) : moveItem(item, position);

  const renderContainer = (
    id: string,
    isBaseContainer: boolean,
    dragHandleRef?: ConnectDragSource
  ) => {
    if (!id) return null;

    const items = order[id];

    return (
      <FormContainer
        container={formId === id ? (form as IFormContainer) : containers[id]}
        dragHandleRef={dragHandleRef}
        handleDiscard={handleDiscard}
        handleEdit={handleEdit}
        handleSave={handleSave}
        id={id}
        isBaseContainer={isBaseContainer}
        isEditMode={formId === id}
      >
        <DragAndDrop.List<ComponentType> handleDrop={handleDrop}>
          {items?.length ? (
            items.map((itemId: string, itemIndex: number) => (
              <DragAndDrop.ListItem<ComponentType>
                key={itemId}
                index={itemIndex}
                itemId={itemId}
                onDrop={handleDrop}
                renderItem={(itemDragHandleRef) => {
                  const component = components[itemId];
                  if (component) {
                    return (
                      <FormComponent
                        id={itemId}
                        isEditMode={formId === itemId}
                        component={
                          formId === itemId ? (form as IFormComponent) : components[itemId]
                        }
                        handleEdit={handleEdit}
                        handleSave={handleSave}
                        debounceSave={debounceSave}
                        handleDiscard={handleDiscard}
                        dragHandleRef={itemDragHandleRef}
                      />
                    );
                  }
                  return containers[itemId] && renderContainer(itemId, false, itemDragHandleRef);
                }}
              />
            ))
          ) : (
            <p className={classes.emptyContainerText}>{t('ux_editor.container_empty')}</p>
          )}
        </DragAndDrop.List>
      </FormContainer>
    );
  };

  return (
    <div className={className}>
      <h1 className={classes.pageHeader}>{layoutName}</h1>
      {layout && renderContainer(BASE_CONTAINER_ID, true)}
    </div>
  );
};
