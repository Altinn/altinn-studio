import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import { FormContainer } from './FormContainer';
import type { FormContainer as IFormContainer } from '../types/FormContainer';
import type { FormComponent as IFormComponent } from '../types/FormComponent';
import type { ExistingDndItem, HandleDrop, ItemPosition, NewDndItem } from '../types/dndTypes';
import { DraggableEditorItemType } from '../types/dndTypes';
import { selectedLayoutNameSelector, selectedLayoutSetSelector } from '../selectors/formLayoutSelectors';
import { FormComponent } from '../components/FormComponent';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutMutation } from '../hooks/mutations/useFormLayoutMutation';
import { generateComponentId } from '../utils/generateId';
import { addItemOfType, moveLayoutItem, validateDepth } from '../utils/formLayoutUtils';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { FormContext } from './FormContext';
import { DroppableList } from '../components/dragAndDrop/DroppableList';
import { DragDropListItem } from '../components/dragAndDrop/DragDropListItem';
import { ConnectDragSource } from 'react-dnd';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useAddItemToLayoutMutation } from '../hooks/mutations/useAddItemToLayoutMutation';

export interface DesignViewProps {
  className?: string;
}

export const DesignView = ({ className }: DesignViewProps) => {
  const { org, app } = useParams();
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
  const { data: layouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const layoutName = useSelector(selectedLayoutNameSelector);
  const { mutate: updateFormLayout } = useFormLayoutMutation(org, app, layoutName, selectedLayoutSet);
  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(org, app, selectedLayoutSet);
  const { formId, form, handleDiscard, handleEdit, handleSave, debounceSave } = useContext(FormContext);

  const { t } = useTranslation();

  const layout = layouts?.[layoutName];

  const { order, containers, components } = layout || {};

  const triggerDepthAlert = () => alert(t('schema_editor.depth_error'));

  const addItem = (item: NewDndItem, { parentId, index }: ItemPosition) => {
    const newId = generateComponentId(item.type, layouts);
    const updatedLayout = addItemOfType(layout, item.type, newId, parentId, index);
    if (validateDepth(updatedLayout)) {
      addItemToLayout({ componentType: item.type, newId, parentId, index });
    } else triggerDepthAlert();
  };
  const moveItem = (item: ExistingDndItem, { parentId, index }: ItemPosition) => {
    const updatedLayout = moveLayoutItem(layout, item.id, parentId, index);
    validateDepth(updatedLayout) ? updateFormLayout(updatedLayout) : triggerDepthAlert();
  };

  const handleDrop: HandleDrop = (item, position) =>
    item.isNew === true ? addItem(item, position) : moveItem(item, position);

  const renderContainer = (
    id: string,
    isBaseContainer: boolean,
    disabledDrop: boolean = false,
    dragHandleRef?: ConnectDragSource,
  ) => {
    if (!id) return null;

    const items = order[id];

    return (
      <FormContainer
        container={formId === id ? form as IFormContainer : containers[id]}
        dragHandleRef={dragHandleRef}
        handleDiscard={handleDiscard}
        handleEdit={handleEdit}
        handleSave={handleSave}
        id={id}
        isBaseContainer={isBaseContainer}
        isEditMode={formId === id}
      >
        <DroppableList containerId={id} handleDrop={handleDrop} disabledDrop={disabledDrop}>
          {items?.length ? items.map((itemId: string, itemIndex: number) => (
            <DragDropListItem
              disabledDrop={disabledDrop}
              key={itemId}
              item={{ isNew: false, id: itemId, position: { parentId: id, index: itemIndex } }}
              onDrop={handleDrop}
              renderItem={(itemDragHandleRef, isDragging) => {
                const component = components[itemId];
                if (component) {
                  return (
                    <FormComponent
                      id={itemId}
                      isEditMode={formId === itemId}
                      component={formId === itemId ? form as IFormComponent : components[itemId]}
                      handleEdit={handleEdit}
                      handleSave={handleSave}
                      debounceSave={debounceSave}
                      handleDiscard={handleDiscard}
                      dragHandleRef={itemDragHandleRef}
                    />
                  );
                }
                return containers[itemId] && renderContainer(
                  itemId,
                  false,
                  disabledDrop || isDragging,
                  itemDragHandleRef
                );
              }}
              type={components[itemId] ? DraggableEditorItemType.Component : DraggableEditorItemType.Container}
            />
          )) : <p className={classes.emptyContainerText}>{t('ux_editor.container_empty')}</p>}
        </DroppableList>
      </FormContainer>
    );
  };

  return (
    <div
      className={className}
    >
      <h1 className={classes.pageHeader}>{layoutName}</h1>
      {layout && renderContainer(BASE_CONTAINER_ID, true)}
    </div>
  );
};
